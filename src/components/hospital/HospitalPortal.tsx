import React, { useState, useEffect } from 'react';
import { 
  Hospital, 
  Users, 
  Activity, 
  BarChart3, 
  MapPin,
  Bell,
  Settings,
  LogOut,
  Heart,
  FileText,
  Search,
  Calendar
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useUser } from '../../hooks/useUser';
import { supabase, Database } from '../../utils/supabase/client';

interface HospitalPortalProps {
  navigate: (page: string) => void;
}

interface HospitalStats {
  totalDonors: number;
  activeRequests: number;
  completedDonations: number;
  pendingRequests: number;
}

export default function HospitalPortal({ navigate }: HospitalPortalProps) {
  const { user, profile, loading, hasRole } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hospitalStats, setHospitalStats] = useState<HospitalStats>({
    totalDonors: 0,
    activeRequests: 0,
    completedDonations: 0,
    pendingRequests: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Security check - redirect if not hospital admin
  useEffect(() => {
    if (!loading && (!user || !profile || !hasRole('hospital_admin'))) {
      navigate('landing');
    }
  }, [loading, user, profile, hasRole, navigate]);

  useEffect(() => {
    if (user && profile && hasRole('hospital_admin') && profile.hospital_id) {
      fetchHospitalStats();
    }
  }, [user, profile, hasRole]);

  const fetchHospitalStats = async () => {
    if (!profile?.hospital_id) return;

    try {
      // Fetch various statistics
      const [donorsResult, requestsResult, donationsResult, pendingResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id')
          .eq('role', 'individual')
          .neq('blood_group', 'Not Set'),
        supabase
          .from('blood_requests')
          .select('id')
          .eq('hospital_id', profile.hospital_id)
          .eq('status', 'active'),
        supabase
          .from('donations')
          .select('id')
          .eq('hospital_id', profile.hospital_id),
        supabase
          .from('blood_requests')
          .select('id')
          .eq('hospital_id', profile.hospital_id)
          .eq('status', 'pending_verification')
      ]);

      setHospitalStats({
        totalDonors: donorsResult.data?.length || 0,
        activeRequests: requestsResult.data?.length || 0,
        completedDonations: donationsResult.data?.length || 0,
        pendingRequests: pendingResult.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching hospital stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('landing');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state
  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hospital portal...</p>
        </div>
      </div>
    );
  }

  // Security check - don't render if not hospital admin
  if (!user || !profile || !hasRole('hospital_admin')) {
    return null;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Hospital Dashboard
        </h1>
        <p className="text-gray-600">
          Manage blood donations and connect with donors in your community.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Donors</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalStats.totalDonors}</p>
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
                <p className="text-2xl font-bold text-gray-900">{hospitalStats.activeRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Donations</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalStats.completedDonations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{hospitalStats.pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setActiveTab('requests')}
              className="w-full justify-start"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Review Blood Requests
            </Button>
            <Button 
              onClick={() => setActiveTab('donors')}
              className="w-full justify-start"
              variant="outline"
            >
              <Users className="h-4 w-4 mr-2" />
              View Available Donors
            </Button>
            <Button 
              onClick={() => setActiveTab('matching')}
              className="w-full justify-start"
              variant="outline"
            >
              <Search className="h-4 w-4 mr-2" />
              Find Matching Donors
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center text-gray-500 py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'requests':
        return (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Blood Requests Management</h3>
            <p className="text-gray-600">Review and manage blood donation requests.</p>
          </div>
        );
      case 'donors':
        return (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Donor Management</h3>
            <p className="text-gray-600">View and contact available blood donors.</p>
          </div>
        );
      case 'matching':
        return (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Donor Matching</h3>
            <p className="text-gray-600">Find compatible donors for specific blood requests.</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics & Reports</h3>
            <p className="text-gray-600">View donation statistics and generate reports.</p>
          </div>
        );
      case 'map':
        return (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Location Mapping</h3>
            <p className="text-gray-600">View donor and recipient locations on an interactive map.</p>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Hospital },
    { id: 'requests', label: 'Requests', icon: FileText },
    { id: 'donors', label: 'Donors', icon: Users },
    { id: 'matching', label: 'Matching', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'map', label: 'Map View', icon: MapPin }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Lifelink</span>
              <span className="ml-3 text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                Hospital Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'H'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{profile.full_name || 'Hospital Admin'}</div>
                  <div className="text-gray-500">Hospital Administrator</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === item.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}