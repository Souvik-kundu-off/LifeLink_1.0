import React, { useState, useEffect } from 'react';
import { AlertTriangle, Database, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { checkDatabaseSetup, DatabaseStatus } from '../utils/databaseSetup';
import SetupInstructions from './SetupInstructions';

interface DatabaseSetupCheckProps {
  children: React.ReactNode;
  onBypass?: () => void;
}

export default function DatabaseSetupCheck({ children, onBypass }: DatabaseSetupCheckProps) {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [skipSetupCheck, setSkipSetupCheck] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    setIsChecking(true);
    setCheckAttempts(prev => prev + 1);
    
    try {
      const status = await checkDatabaseSetup();
      setDbStatus(status);
    } catch (error: any) {
      console.error('Error checking database setup:', error);
      
      // If we've had multiple failed attempts and it's a network error, 
      // assume database is not set up rather than keep failing
      if (checkAttempts >= 2 && 
          (error.message?.includes('Failed to fetch') || error.name === 'TypeError')) {
        setDbStatus({
          isSetup: false,
          missingTables: ['profiles', 'hospitals', 'blood_requests', 'donations'],
          error: 'DATABASE_NOT_SETUP'
        });
      } else {
        setDbStatus({
          isSetup: false,
          missingTables: [],
          error: 'Failed to check database setup. This usually means the database is not set up yet.'
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking database setup...</p>
        </div>
      </div>
    );
  }

  // Show setup required screen if database is not configured
  if (dbStatus && !dbStatus.isSetup) {
    // For fresh setup (no tables exist), show the friendly setup instructions
    if (dbStatus.error === 'DATABASE_NOT_SETUP' || dbStatus.missingTables.length === 4) {
      return (
        <SetupInstructions
          onRetry={checkSetup}
          isRetrying={isChecking}
          onSkip={() => setSkipSetupCheck(true)}
          onBypass={onBypass}
        />
      );
    }

    // For other errors (like RLS recursion), show the detailed troubleshooting
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Database Issues Detected
            </CardTitle>
            <CardDescription>
              There are some issues with your database configuration that need to be resolved.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {dbStatus.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {dbStatus.error === 'RLS_RECURSION_ERROR' ? (
                    <>
                      <strong>RLS Policy Recursion Error:</strong> The database policies are causing infinite recursion. 
                      Run the <strong>SIMPLE_RLS_FIX.sql</strong> script to replace complex policies with a simplified, 
                      non-recursive approach that moves role-based authorization to the application layer.
                    </>
                  ) : (
                    <>
                      <strong>Error:</strong> {dbStatus.error}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {dbStatus.missingTables.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Missing Tables:</h3>
                <div className="flex flex-wrap gap-2">
                  {dbStatus.missingTables.map((table) => (
                    <Badge key={table} variant="outline" className="border-orange-200 text-orange-800">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Fix Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Open your Supabase project dashboard</li>
                <li>Navigate to the SQL Editor</li>
                <li>Copy and paste the <strong>complete SQL from SIMPLE_RLS_FIX.sql</strong></li>
                <li>Execute the SQL to fix all issues</li>
                <li>Return here and click "Check Setup" to verify</li>
              </ol>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setShowDetails(!showDetails)}
                variant="outline"
                className="w-full"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>

              {showDetails && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">SQL Fix Script:</h4>
                  <div className="bg-gray-800 text-green-400 p-3 rounded mt-2 text-xs font-mono overflow-x-auto">
                    <div>-- Use SIMPLE_RLS_FIX.sql for complete fix:</div>
                    <div>DROP POLICY IF EXISTS ...</div>
                    <div>ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;</div>
                    <div>-- ... (complete simplified RLS setup)</div>
                    <div>CREATE POLICY "profiles_self_access" ON public.profiles ...</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={checkSetup}
                  disabled={isChecking}
                  className="flex-1"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Setup
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Supabase
                </Button>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Need Help?</strong> Run the <strong>SIMPLE_RLS_FIX.sql</strong> file - it completely fixes all issues with a simplified approach.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user chose to skip setup check, or database is set up, render the app
  if (skipSetupCheck || (dbStatus && dbStatus.isSetup)) {
    return <>{children}</>;
  }

  // This shouldn't be reached, but just in case
  return <>{children}</>;
}