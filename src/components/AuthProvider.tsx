import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Database } from '../utils/supabase/client';
import { createUserProfile, safeQuery } from '../utils/databaseSetup';
import { hasRole, hasAnyRole, canAccessHospital, canManageBloodRequests } from '../utils/authorization';

interface Profile extends Database['public']['Tables']['profiles']['Row'] {}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Authorization helpers
  hasRole: (role: 'individual' | 'hospital_admin' | 'platform_admin') => boolean;
  hasAnyRole: (roles: ('individual' | 'hospital_admin' | 'platform_admin')[]) => boolean;
  canAccessHospital: (hospitalId: string) => boolean;
  canManageBloodRequests: (hospitalId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error, isSetupError } = await safeQuery('profiles', () =>
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      );

      if (isSetupError) {
        console.error('Database setup error when fetching profile:', error);
        setLoading(false);
        return;
      }

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async function signUp(email: string, password: string, userData: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    setProfile(null);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;

    const { data, error, isSetupError } = await safeQuery('profiles', () =>
      supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
    );

    if (isSetupError) {
      throw new Error('Database tables are not set up. Please run the database setup script first.');
    }

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    await refreshProfile();
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  // Create authorization context
  const authContext = { user, profile };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    // Authorization helpers
    hasRole: (role: 'individual' | 'hospital_admin' | 'platform_admin') => hasRole(authContext, role),
    hasAnyRole: (roles: ('individual' | 'hospital_admin' | 'platform_admin')[]) => hasAnyRole(authContext, roles),
    canAccessHospital: (hospitalId: string) => canAccessHospital(authContext, hospitalId),
    canManageBloodRequests: (hospitalId?: string) => canManageBloodRequests(authContext, hospitalId),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}