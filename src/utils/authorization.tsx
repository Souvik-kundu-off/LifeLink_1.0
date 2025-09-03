import { supabase, Database } from './supabase/client';

type UserRole = 'individual' | 'hospital_admin' | 'platform_admin';
type Profile = Database['public']['Tables']['profiles']['Row'];

// Authorization utilities for application-layer role checking
// Since we moved away from complex RLS policies, we handle authorization in the app

export interface AuthContext {
  user: any;
  profile: Profile | null;
}

// Check if user has required role
export const hasRole = (authContext: AuthContext, requiredRole: UserRole): boolean => {
  if (!authContext.user || !authContext.profile) {
    return false;
  }
  
  return authContext.profile.role === requiredRole;
};

// Check if user has any of the specified roles
export const hasAnyRole = (authContext: AuthContext, requiredRoles: UserRole[]): boolean => {
  if (!authContext.user || !authContext.profile) {
    return false;
  }
  
  return requiredRoles.includes(authContext.profile.role as UserRole);
};

// Check if user can access hospital-specific data
export const canAccessHospital = (authContext: AuthContext, hospitalId: string): boolean => {
  if (!authContext.user || !authContext.profile) {
    return false;
  }
  
  // Platform admins can access everything
  if (authContext.profile.role === 'platform_admin') {
    return true;
  }
  
  // Hospital admins can only access their own hospital
  if (authContext.profile.role === 'hospital_admin') {
    return authContext.profile.hospital_id === hospitalId;
  }
  
  return false;
};

// Check if user can manage blood requests for a specific hospital
export const canManageBloodRequests = (authContext: AuthContext, hospitalId?: string): boolean => {
  if (!authContext.user || !authContext.profile) {
    return false;
  }
  
  // Platform admins can manage all requests
  if (authContext.profile.role === 'platform_admin') {
    return true;
  }
  
  // Hospital admins can manage requests for their hospital
  if (authContext.profile.role === 'hospital_admin' && hospitalId) {
    return authContext.profile.hospital_id === hospitalId;
  }
  
  return false;
};

// Safe query wrapper that includes authorization checks
export const authorizedQuery = async (
  authContext: AuthContext,
  queryFn: () => Promise<any>,
  requiredRole?: UserRole | UserRole[]
): Promise<{ data: any; error: any; unauthorized?: boolean }> => {
  
  // Check authorization if role requirements specified
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!hasAnyRole(authContext, roles)) {
      return {
        data: null,
        error: {
          message: 'Insufficient permissions',
          code: 'UNAUTHORIZED'
        },
        unauthorized: true
      };
    }
  }
  
  try {
    const result = await queryFn();
    return {
      data: result.data,
      error: result.error,
      unauthorized: false
    };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message || 'An error occurred',
        code: error.code
      },
      unauthorized: false
    };
  }
};

// Fetch user profiles with role-based filtering (application-level)
export const fetchProfilesForRole = async (authContext: AuthContext, targetRole?: UserRole) => {
  if (!hasAnyRole(authContext, ['hospital_admin', 'platform_admin'])) {
    return {
      data: null,
      error: { message: 'Insufficient permissions', code: 'UNAUTHORIZED' },
      unauthorized: true
    };
  }
  
  let query = supabase.from('profiles').select('*');
  
  // Hospital admins can only see individual users
  if (authContext.profile?.role === 'hospital_admin') {
    query = query.eq('role', 'individual');
  }
  
  // Apply target role filter if specified
  if (targetRole) {
    query = query.eq('role', targetRole);
  }
  
  const result = await query;
  return {
    data: result.data,
    error: result.error,
    unauthorized: false
  };
};

// Fetch blood requests with appropriate filtering
export const fetchBloodRequests = async (authContext: AuthContext, filters?: {
  status?: string;
  hospitalId?: string;
  requesterId?: string;
}) => {
  let query = supabase
    .from('blood_requests')
    .select(`
      *,
      hospitals (
        id,
        name,
        address
      ),
      profiles (
        id,
        full_name
      )
    `);
  
  // Apply role-based filtering
  if (authContext.profile?.role === 'hospital_admin') {
    // Hospital admins only see requests for their hospital
    if (authContext.profile.hospital_id) {
      query = query.eq('hospital_id', authContext.profile.hospital_id);
    } else {
      // Hospital admin without hospital assignment can't see requests
      return {
        data: [],
        error: null,
        unauthorized: false
      };
    }
  } else if (authContext.profile?.role === 'individual') {
    // Individuals can see their own requests or active public requests
    if (filters?.requesterId) {
      query = query.eq('requester_id', authContext.user.id);
    } else {
      query = query.eq('status', 'active');
    }
  }
  // Platform admins can see all requests (no additional filtering)
  
  // Apply additional filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.hospitalId) {
    query = query.eq('hospital_id', filters.hospitalId);
  }
  
  if (filters?.requesterId) {
    query = query.eq('requester_id', filters.requesterId);
  }
  
  const result = await query.order('created_at', { ascending: false });
  return {
    data: result.data,
    error: result.error,
    unauthorized: false
  };
};