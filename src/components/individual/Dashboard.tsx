import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  User, 
  FileText, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Plus,
  Bell,
  Settings,
  LogOut,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '../AuthProvider';
import { supabase, Database } from '../../utils/supabase/client';
import ProfileCompleteModal from './ProfileCompleteModal';
import CreateRequestModal from './CreateRequestModal';
import NotificationSystem from '../NotificationSystem';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface DashboardProps {
  navigate: (page: string) => void;
}

interface BloodRequest extends Database['public']['Tables']['blood_requests']['Row'] {
  hospitals: Database['public']['Tables']['hospitals']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
}

interface UserBloodRequest extends Database['public']['Tables']['blood_requests']['Row'] {
  hospitals: Database['public']['Tables']['hospitals']['Row'];
}

export default function Dashboard({ navigate }: DashboardProps) {
  const { user, profile, signOut, loading } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [communityNeeds, setCommunityNeeds] = useState<BloodRequest[]>([]);
  const [userRequests, setUserRequests] = useState<UserBloodRequest[]>([]);
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeRequests: 0,
    lastDonation: null as string | null
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user && profile) {
      fetchCommunityNeeds();
      fetchUserRequests();
      fetchUserStats();
    }
  }, [user, profile]);

  const fetchCommunityNeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select(`
          *,
          hospitals (
            id,
            name,
            address,
            location
          ),
          profiles (
            id,
            full_name
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching community needs:', error);
        return;
      }

      setCommunityNeeds(data || []);
    } catch (error) {
      console.error('Error fetching community needs:', error);
    }
  };

  const fetchUserRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select(`
          *,
          hospitals (
            id,
            name,
            address
          )
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user requests:', error);
        return;
      }

      setUserRequests(data || []);
    } catch (error) {
      console.error('Error fetching user requests:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Get total donations
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('donation_date')
        .eq('donor_id', user.id);

      if (donationsError) {
        console.error('Error fetching donations:', donationsError);
      }

      // Get active requests count
      const { data: requestsData, error: requestsError } = await supabase
        .from('blood_requests')
        .select('id')
        .eq('requester_id', user.id)
        .in('status', ['pending_verification', 'active']);

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      }

      const donations = donationsData || [];
      const lastDonation = donations.length > 0 
        ? donations.sort((a, b) => new Date(b.donation_date).getTime() - new Date(a.donation_date).getTime())[0].donation_date
        : null;

      setStats({
        totalDonations: donations.length,
        activeRequests: requestsData?.length || 0,
        lastDonation
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('landing');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'fulfilled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    navigate('login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Lifelink</span>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationSystem />
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{profile.full_name || 'User'}</div>
                  <div className="text-gray-500">{profile.email}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Incomplete Alert */}
        {!profile.profile_complete && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-yellow-800">
                Please complete your profile to access all features and respond to donation requests.
              </span>
              <Button
                size="sm"
                onClick={() => setShowProfileModal(true)}
                className="ml-4"
              >
                Complete Profile
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {profile.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Ready to save lives? Check out donation opportunities and manage your requests.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Donations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDonations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">
                    {profile.availability_status?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last Donation</p>
                  <p className="text-sm font-bold text-gray-900">
                    {stats.lastDonation 
                      ? formatDistanceToNow(new Date(stats.lastDonation), { addSuffix: true })
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Community Needs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Community Needs
              </CardTitle>
              <CardDescription>
                Donation opportunities near you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {communityNeeds.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No active donation requests at the moment.
                  </p>
                ) : (
                  communityNeeds.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {request.patient_name}, {request.patient_age} years
                          </h4>
                          <p className="text-sm text-gray-600">
                            Requested by {request.profiles?.full_name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {request.blood_group_needed}
                          </Badge>
                          <Badge className={getUrgencyColor(request.urgency)}>
                            {request.urgency}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {request.hospitals?.name}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </div>
                      
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!profile.profile_complete}
                      >
                        {profile.profile_complete ? 'Respond to Request' : 'Complete Profile First'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  My Requests
                </div>
                <Button size="sm" onClick={() => setShowCreateRequestModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Request
                </Button>
              </CardTitle>
              <CardDescription>
                Your blood donation requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    You haven't created any requests yet.
                  </p>
                ) : (
                  userRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {request.patient_name}, {request.patient_age} years
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {request.blood_group_needed}
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {request.hospitals?.name}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Created {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </div>
                      
                      <Badge className={getUrgencyColor(request.urgency)}>
                        {request.urgency} Priority
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileCompleteModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          profile={profile}
        />
      )}

      {showCreateRequestModal && (
        <CreateRequestModal
          isOpen={showCreateRequestModal}
          onClose={() => setShowCreateRequestModal(false)}
          onSuccess={() => {
            setShowCreateRequestModal(false);
            fetchUserRequests();
          }}
        />
      )}
    </div>
  );
}