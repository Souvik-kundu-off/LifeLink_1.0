import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to authenticate user
const authenticateUser = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  
  c.set('user', user);
  await next();
};

// Health check endpoint
app.get("/make-server-1ed20dc8/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Blood compatibility matching
const getCompatibleDonors = (recipientBloodType: string): string[] => {
  const compatibility: { [key: string]: string[] } = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-']
  };
  
  return compatibility[recipientBloodType] || [];
};

// Find matching donors for a blood request
app.post("/make-server-1ed20dc8/find-donors", authenticateUser, async (c) => {
  try {
    const body = await c.req.json();
    const { blood_group_needed, hospital_location, radius_km = 50 } = body;
    
    if (!blood_group_needed) {
      return c.json({ error: 'Blood group is required' }, 400);
    }
    
    const compatibleBloodTypes = getCompatibleDonors(blood_group_needed);
    
    // Find compatible donors
    const { data: donors, error } = await supabase
      .from('profiles')
      .select('id, full_name, blood_group, location, phone_number, availability_status')
      .eq('role', 'individual')
      .eq('profile_complete', true)
      .eq('availability_status', 'Available')
      .in('blood_group', compatibleBloodTypes);
    
    if (error) {
      console.error('Error finding donors:', error);
      return c.json({ error: 'Failed to find donors' }, 500);
    }
    
    // TODO: Add location-based filtering using PostGIS functions
    // For now, return all compatible donors
    
    return c.json({
      success: true,
      donors: donors || [],
      blood_group_needed,
      compatible_types: compatibleBloodTypes
    });
    
  } catch (error) {
    console.error('Error in find-donors endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Notify potential donors about a new request
app.post("/make-server-1ed20dc8/notify-donors", authenticateUser, async (c) => {
  try {
    const body = await c.req.json();
    const { request_id, donor_ids } = body;
    
    if (!request_id || !Array.isArray(donor_ids)) {
      return c.json({ error: 'Request ID and donor IDs are required' }, 400);
    }
    
    // Get request details
    const { data: request, error: requestError } = await supabase
      .from('blood_requests')
      .select(`
        *,
        hospitals (name, address),
        profiles (full_name)
      `)
      .eq('id', request_id)
      .single();
    
    if (requestError || !request) {
      return c.json({ error: 'Request not found' }, 404);
    }
    
    // Store notifications in KV store
    const notifications = donor_ids.map(donorId => ({
      id: crypto.randomUUID(),
      donor_id: donorId,
      request_id: request_id,
      message: `New blood donation request: ${request.blood_group_needed} needed at ${request.hospitals.name}`,
      urgency: request.urgency,
      created_at: new Date().toISOString(),
      read: false
    }));
    
    // Store notifications
    for (const notification of notifications) {
      await kv.set(`notification:${notification.id}`, notification);
      await kv.set(`donor_notifications:${notification.donor_id}:${notification.id}`, notification.id);
    }
    
    return c.json({
      success: true,
      message: `Notifications sent to ${donor_ids.length} donors`,
      notifications_count: notifications.length
    });
    
  } catch (error) {
    console.error('Error in notify-donors endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get notifications for a donor
app.get("/make-server-1ed20dc8/notifications/:donor_id", authenticateUser, async (c) => {
  try {
    const donorId = c.req.param('donor_id');
    const user = c.get('user');
    
    // Ensure user can only access their own notifications
    if (user.id !== donorId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    // Get notification IDs for this donor
    const notificationIds = await kv.getByPrefix(`donor_notifications:${donorId}:`);
    
    const notifications = [];
    for (const idEntry of notificationIds) {
      const notification = await kv.get(`notification:${idEntry.value}`);
      if (notification) {
        notifications.push(notification);
      }
    }
    
    // Sort by created_at descending
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({
      success: true,
      notifications
    });
    
  } catch (error) {
    console.error('Error in get notifications endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mark notification as read
app.put("/make-server-1ed20dc8/notifications/:notification_id/read", authenticateUser, async (c) => {
  try {
    const notificationId = c.req.param('notification_id');
    
    const notification = await kv.get(`notification:${notificationId}`);
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }
    
    notification.read = true;
    await kv.set(`notification:${notificationId}`, notification);
    
    return c.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Analytics endpoint for platform statistics
app.get("/make-server-1ed20dc8/analytics/platform-stats", authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    
    // Check if user is platform admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'platform_admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }
    
    // Get platform statistics
    const [usersResult, hospitalsResult, requestsResult, donationsResult] = await Promise.all([
      supabase.from('profiles').select('id, role, created_at').eq('role', 'individual'),
      supabase.from('hospitals').select('id, status, created_at'),
      supabase.from('blood_requests').select('id, status, urgency, created_at'),
      supabase.from('donations').select('id, donation_date')
    ]);
    
    const users = usersResult.data || [];
    const hospitals = hospitalsResult.data || [];
    const requests = requestsResult.data || [];
    const donations = donationsResult.data || [];
    
    // Calculate trends (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const recentUsers = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;
    const previousUsers = users.filter(u => 
      new Date(u.created_at) > sixtyDaysAgo && new Date(u.created_at) <= thirtyDaysAgo
    ).length;
    
    return c.json({
      success: true,
      stats: {
        total_users: users.length,
        total_hospitals: hospitals.length,
        approved_hospitals: hospitals.filter(h => h.status === 'approved').length,
        pending_hospitals: hospitals.filter(h => h.status === 'pending_review').length,
        total_requests: requests.length,
        active_requests: requests.filter(r => r.status === 'active').length,
        critical_requests: requests.filter(r => r.status === 'active' && r.urgency === 'Critical').length,
        total_donations: donations.length,
        recent_users: recentUsers,
        user_growth_rate: previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers * 100) : 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in analytics endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Hospital analytics endpoint
app.get("/make-server-1ed20dc8/analytics/hospital/:hospital_id", authenticateUser, async (c) => {
  try {
    const hospitalId = c.req.param('hospital_id');
    const user = c.get('user');
    
    // Check if user is authorized (hospital admin for this hospital or platform admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, hospital_id')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'platform_admin' && profile.hospital_id !== hospitalId)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    // Get hospital-specific statistics
    const [requestsResult, donationsResult] = await Promise.all([
      supabase
        .from('blood_requests')
        .select('id, status, urgency, blood_group_needed, created_at')
        .eq('hospital_id', hospitalId),
      supabase
        .from('donations')
        .select('id, donation_date, donor_id')
        .eq('hospital_id', hospitalId)
    ]);
    
    const requests = requestsResult.data || [];
    const donations = donationsResult.data || [];
    
    // Calculate blood type distribution
    const bloodTypeDistribution: { [key: string]: number } = {};
    requests.forEach(r => {
      bloodTypeDistribution[r.blood_group_needed] = (bloodTypeDistribution[r.blood_group_needed] || 0) + 1;
    });
    
    return c.json({
      success: true,
      hospital_id: hospitalId,
      stats: {
        total_requests: requests.length,
        active_requests: requests.filter(r => r.status === 'active').length,
        fulfilled_requests: requests.filter(r => r.status === 'fulfilled').length,
        pending_requests: requests.filter(r => r.status === 'pending_verification').length,
        total_donations: donations.length,
        blood_type_distribution: bloodTypeDistribution,
        urgency_distribution: {
          critical: requests.filter(r => r.urgency === 'Critical').length,
          high: requests.filter(r => r.urgency === 'High').length,
          medium: requests.filter(r => r.urgency === 'Medium').length,
          low: requests.filter(r => r.urgency === 'Low').length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in hospital analytics endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

Deno.serve(app.fetch);