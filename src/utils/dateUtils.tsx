// Simple date utility functions since date-fns might not be available

export const formatDistanceToNow = (date: Date, options?: { addSuffix?: boolean }): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return options?.addSuffix ? 'less than a minute ago' : 'less than a minute';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    const suffix = options?.addSuffix ? ' ago' : '';
    return diffInMinutes === 1 ? `1 minute${suffix}` : `${diffInMinutes} minutes${suffix}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const suffix = options?.addSuffix ? ' ago' : '';
    return diffInHours === 1 ? `1 hour${suffix}` : `${diffInHours} hours${suffix}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    const suffix = options?.addSuffix ? ' ago' : '';
    return diffInDays === 1 ? `1 day${suffix}` : `${diffInDays} days${suffix}`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    const suffix = options?.addSuffix ? ' ago' : '';
    return diffInMonths === 1 ? `1 month${suffix}` : `${diffInMonths} months${suffix}`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  const suffix = options?.addSuffix ? ' ago' : '';
  return diffInYears === 1 ? `1 year${suffix}` : `${diffInYears} years${suffix}`;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};