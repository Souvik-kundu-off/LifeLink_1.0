import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Heart, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../utils/supabase/client';

interface LoginProps {
  navigate: (page: string) => void;
  role: 'individual' | 'hospital_admin' | 'platform_admin';
}

export default function Login({ navigate, role }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const roleConfig = {
    individual: {
      title: 'Individual Portal',
      description: 'Join our community of lifesavers',
      redirectPage: 'dashboard'
    },
    hospital_admin: {
      title: 'Hospital Portal',
      description: 'Manage your hospital\'s blood donation needs',
      redirectPage: 'hospital'
    },
    platform_admin: {
      title: 'Admin Portal',
      description: 'System administration and management',
      redirectPage: 'admin'
    }
  };

  const config = roleConfig[role];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Check user role after sign in
      if (data.user) {
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // If profile doesn't exist, create it
        if (profileError && profileError.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          
          const newProfile = {
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || 'Unknown',
            email: data.user.email,
            role: data.user.user_metadata?.role || 'individual',
            profile_complete: false,
            availability_status: 'Available',
            blood_group: 'Not Set'
          };
          
          const { error: createError } = await supabase
            .from('profiles')
            .insert(newProfile);
            
          if (createError) {
            console.error('Error creating profile:', createError);
            setError('Error creating user profile. Please try again.');
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }
          
          // Fetch the newly created profile
          const { data: newProfileData, error: fetchError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (fetchError) {
            setError('Error fetching user profile. Please try again.');
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }
          
          profileData = newProfileData;
        } else if (profileError) {
          setError('Error verifying user role. Please try again.');
          setIsLoading(false);
          return;
        }

        if (profileData && profileData.role !== role) {
          setError(`This account is not authorized for ${config.title.toLowerCase()}`);
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        // Redirect based on role
        if (profileData?.role === 'individual') {
          navigate('dashboard');
        } else if (profileData?.role === 'hospital_admin') {
          navigate('hospital');
        } else if (profileData?.role === 'platform_admin') {
          navigate('admin');
        }
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign in error:', err);
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          },
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // For now, just show success and ask user to sign in
        // The profile will be created when they first sign in
        setError('');
        setActiveTab('login');
        alert('Account created successfully! Please check your email and sign in. Your profile will be created automatically.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign up error:', err);
    }

    setIsLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError('');

    // For testing - just show a message
    console.log('Social login attempt:', { provider, role });
    setError(`${provider} login is being tested. This is a demo.`);
    
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const testProfilesTable = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Test if profiles table exists and what its structure is
      const { data, error } = await supabase.from('profiles').select('*').limit(1);
      if (error) {
        setError(`Profiles table error: ${error.message}`);
        console.error('Profiles table error details:', error);
      } else {
        setError(`Profiles table accessible! Found ${data?.length || 0} profiles`);
        console.log('Profiles table structure:', data);
      }
    } catch (err: any) {
      setError(`Profiles table error: ${err.message}`);
      console.error('Profiles table exception:', err);
    }
    setIsLoading(false);
  };

  const testProfileInsert = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Test inserting a simple profile
      const testProfile = {
        id: 'test-' + Date.now(),
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'individual',
        profile_complete: false,
        availability_status: 'Available',
        blood_group: 'Not Set'
      };
      
      console.log('Attempting to insert test profile:', testProfile);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(testProfile)
        .select();
        
      if (error) {
        setError(`Profile insert test failed: ${error.message}`);
        console.error('Profile insert error details:', error);
      } else {
        setError('Profile insert test successful!');
        console.log('Profile insert result:', data);
        
        // Clean up - delete the test profile
        await supabase.from('profiles').delete().eq('id', testProfile.id);
      }
    } catch (err: any) {
      setError(`Profile insert test error: ${err.message}`);
      console.error('Profile insert test exception:', err);
    }
    setIsLoading(false);
  };

  const checkRLSPolicies = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Check current user authentication status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        setError(`Auth error: ${authError.message}`);
        return;
      }
      
      if (!user) {
        setError('No authenticated user. Please sign in first.');
        return;
      }
      
      console.log('Current user:', user);
      setError(`Current user: ${user.email} (ID: ${user.id})`);
      
      // Try to insert profile with authenticated user ID
      const testProfile = {
        id: user.id, // Use the actual authenticated user's ID
        full_name: 'Test User',
        email: user.email,
        role: 'individual',
        profile_complete: false,
        availability_status: 'Available',
        blood_group: 'Not Set'
      };
      
      console.log('Attempting to insert profile for authenticated user:', testProfile);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(testProfile)
        .select();
        
      if (error) {
        setError(`Authenticated insert failed: ${error.message}`);
        console.error('Authenticated insert error:', error);
      } else {
        setError('Authenticated insert successful!');
        console.log('Authenticated insert result:', data);
        
        // Clean up
        await supabase.from('profiles').delete().eq('id', user.id);
      }
    } catch (err: any) {
      setError(`RLS check error: ${err.message}`);
      console.error('RLS check exception:', err);
    }
    setIsLoading(false);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button
              onClick={() => navigate('landing')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </button>
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Lifelink</span>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
                      <CardTitle className="text-2xl font-bold">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>



          {role === 'individual' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialLogin('github')}
                  disabled={isLoading}
                >
                  GitHub
                </Button>
              </div>
            </>
          )}



          {/* Test Profiles Table */}
          <div className="mt-2">
            <Button
              variant="outline"
              onClick={testProfilesTable}
              disabled={isLoading}
              className="w-full"
            >
              Test Profiles Table
            </Button>
          </div>

          {/* Test Profile Insert */}
          <div className="mt-2">
            <Button
              variant="outline"
              onClick={testProfileInsert}
              disabled={isLoading}
              className="w-full"
            >
              Test Profile Insert
            </Button>
          </div>

          {/* RLS Policy Check */}
          <div className="mt-2">
            <Button
              variant="outline"
              onClick={checkRLSPolicies}
              disabled={isLoading}
              className="w-full"
            >
              Check RLS Policies
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);
}