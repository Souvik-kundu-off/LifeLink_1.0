import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Building2, 
  Users, 
  Settings, 
  BarChart3, 
  FileText,
  Bell,
  LogOut,
  Heart,
  CheckCircle,
  XCircle,
  Clock,
  Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { useAuth } from '../AuthProvider';
import { supabase, Database } from '../../utils/supabase/client';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface AdminPortalProps {
  navigate: (page: string) => void;
}

interface PlatformStats {
  totalUsers: number;
  totalHospitals: number;
  pendingHospitals: number;
  totalDonations: number;
  activeRequests: number;
}

interface PendingHospital extends Database['public']['Tables']['hospitals']['Row'] {}

export default function AdminPortal({ navigate }: AdminPortalProps) {
  const { user, profile, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalHospitals: 0,
    pendingHospitals: 0,
    totalDonations: 0,
    activeRequests: 0
  });
  const [pendingHospitals, setPendingHospitals] = useState<PendingHospital[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && profile && profile.role === 'platform_admin') {
      fetchPlatformStats();
      fetchPendingHospitals();
    }
  }, [user, profile]);

  const fetchPlatformStats = async () => {
    try {
      const [usersResult, hospitalsResult, donationsResult, requestsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id')
          .eq('role', 'individual'),
        supabase
          .from('hospitals')
          .select('id, status'),
        supabase
          .from('donations')
          .select('id'),
        supabase
          .from('blood_requests')
          .select('id')
          .eq('status', 'active')
      ]);

      const hospitals = hospitalsResult.data || [];
      const pendingCount = hospitals.filter(h => h.status === 'pending_review').length;

      setPlatformStats({
        totalUsers: usersResult.data?.length || 0,
        totalHospitals: hospitals.length,
        pendingHospitals: pendingCount,
        totalDonations: donationsResult.data?.length || 0,
        activeRequests: requestsResult.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchPendingHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending hospitals:', error);
        return;
      }

      setPendingHospitals(data || []);
    } catch (error) {
      console.error('Error fetching pending hospitals:', error);
    }
  };

  const handleApproveHospital = async (hospitalId: string) => {
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({ status: 'approved' })
        .eq('id', hospitalId);

      if (error) {
        console.error('Error approving hospital:', error);
        return;
      }

      // Refresh data
      fetchPlatformStats();
      fetchPendingHospitals();
    } catch (error) {
      console.error('Error approving hospital:', error);
    }
  };

  const handleRejectHospital = async (hospitalId: string) => {
    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', hospitalId);

      if (error) {
        console.error('Error rejecting hospital:', error);
        return;
      }

      // Refresh data
      fetchPlatformStats();
      fetchPendingHospitals();
    } catch (error) {
      console.error('Error rejecting hospital:', error);
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

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'platform_admin') {
    navigate('admin-login');
    return null;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Platform Administration
        </h1>
        <p className="text-gray-600">
          Monitor and manage the Lifelink platform operations.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hospitals</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats.totalHospitals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats.pendingHospitals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Donations</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats.totalDonations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Requests</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats.activeRequests}</p>
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
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setActiveTab('hospitals')}
              className="w-full justify-start"
              variant="outline"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Review Hospital Applications
              {platformStats.pendingHospitals > 0 && (
                <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                  {platformStats.pendingHospitals}
                </Badge>
              )}
            </Button>
            <Button 
              onClick={() => setActiveTab('users')}
              className="w-full justify-start"
              variant="outline"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button 
              onClick={() => setActiveTab('analytics')}
              className="w-full justify-start"
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Platform Analytics
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Platform performance and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Authentication</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Services</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderHospitalVerification = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Hospital Verification</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search hospitals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {pendingHospitals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Applications</h3>
            <p className="text-gray-600">All hospital applications have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingHospitals.map((hospital) => (
            <Card key={hospital.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{hospital.name}</h3>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending Review
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Address:</p>
                        <p className="text-gray-900">{hospital.address}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Contact Person:</p>
                        <p className="text-gray-900">{hospital.contact_person_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Contact Info:</p>
                        <p className="text-gray-900">{hospital.contact_info}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">License Number:</p>
                        <p className="text-gray-900">{hospital.license_number}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-500">
                      Applied {formatDistanceToNow(new Date(hospital.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-6">
                    <Button
                      size="sm"
                      onClick={() => handleApproveHospital(hospital.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectHospital(hospital.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'hospitals':
        return renderHospitalVerification();
      case 'users':
        return (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600">Manage platform users and their permissions.</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Platform Analytics</h3>
            <p className="text-gray-600">View detailed analytics and platform metrics.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">System Settings</h3>
            <p className="text-gray-600">Configure platform settings and preferences.</p>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'hospitals', label: 'Hospital Verification', icon: Building2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
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
              <span className="ml-3 text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                Admin Portal
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
                    {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{profile.full_name || 'Admin'}</div>
                  <div className="text-gray-500">Platform Administrator</div>
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
                            ? 'bg-purple-100 text-purple-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                        {item.id === 'hospitals' && platformStats.pendingHospitals > 0 && (
                          <Badge className="ml-auto bg-yellow-100 text-yellow-800 text-xs">
                            {platformStats.pendingHospitals}
                          </Badge>
                        )}
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