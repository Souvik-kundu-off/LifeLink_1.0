// Environment configuration for Supabase
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://lztzkuqpnnsubngplksk.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dHprdXFwbm5zdWJuZ3Bsa3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTczNDcsImV4cCI6MjA3MTc5MzM0N30.azL_3tZCIiAz3aXowvLIX6yCe_FNYkPWCuh7jSi4r7o'
  }
};

// Validate required environment variables
if (!config.supabase.url || !config.supabase.anonKey) {
  console.warn('Missing Supabase environment variables. Using fallback values.');
}
