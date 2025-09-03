import { useContext } from 'react';
import { AuthContext } from '../components/AuthProvider';

export function useUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  
  return {
    user: context.user,
    profile: context.profile,
    loading: context.loading,
    hasRole: context.hasRole,
    hasAnyRole: context.hasAnyRole,
    canAccessHospital: context.canAccessHospital,
    canManageBloodRequests: context.canManageBloodRequests,
  };
}
