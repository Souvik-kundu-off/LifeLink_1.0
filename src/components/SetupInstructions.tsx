import React, { useState } from 'react';
import { Copy, ExternalLink, CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

interface SetupInstructionsProps {
  onRetry: () => void;
  isRetrying: boolean;
  onSkip?: () => void;
  onBypass?: () => void;
}

export default function SetupInstructions({ onRetry, isRetrying, onSkip, onBypass }: SetupInstructionsProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const setupSQL = `-- COMPLETE LIFELINK SUPABASE SETUP
-- Run this entire script in your Supabase SQL Editor to set up the database correctly

-- ====================================================================
-- STEP 1: Enable Extensions and Create Types
-- ====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types for enums
CREATE TYPE blood_group_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Not Set');
CREATE TYPE availability_status_enum AS ENUM ('Available', 'Unavailable', 'Recently Donated');
CREATE TYPE user_role_enum AS ENUM ('individual', 'hospital_admin', 'platform_admin');
CREATE TYPE hospital_status_enum AS ENUM ('pending_review', 'approved', 'suspended');
CREATE TYPE request_status_enum AS ENUM ('pending_verification', 'active', 'fulfilled', 'cancelled');
CREATE TYPE urgency_enum AS ENUM ('Critical', 'High', 'Medium', 'Low');

-- ====================================================================
-- STEP 2: Create Tables
-- ====================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    date_of_birth DATE,
    blood_group blood_group_enum DEFAULT 'Not Set',
    location GEOGRAPHY(POINT, 4326),
    availability_status availability_status_enum DEFAULT 'Available',
    profile_complete BOOLEAN DEFAULT FALSE,
    role user_role_enum DEFAULT 'individual',
    hospital_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue with complete setup...
-- (See COMPLETE_SUPABASE_SETUP.sql for full script)`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-3xl">🩸 Lifelink Database Setup</CardTitle>
          <CardDescription className="text-lg">
            Welcome to Lifelink! Let's get your blood donation platform database set up in just a few steps.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Overview */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>First Time Setup:</strong> Your Supabase connection is configured, but the database tables need to be created. 
              The "Failed to fetch" errors you're seeing are normal - they happen because the tables don't exist yet. 
              This setup will take about 2 minutes to complete.
            </AlertDescription>
          </Alert>

          {/* Step-by-step instructions */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Setup Steps</h3>
            
            {/* Step 1 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Badge className="bg-blue-100 text-blue-800 mr-3">Step 1</Badge>
                  <h4 className="text-lg font-medium">Open Supabase Dashboard</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Dashboard
                </Button>
              </div>
              <p className="text-gray-600 mb-3">
                Navigate to your Supabase project dashboard and find the SQL Editor in the left sidebar.
              </p>
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                <strong>Your Project ID:</strong> lztzkuqpnnsubngplksk
              </div>
            </div>

            {/* Step 2 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Badge className="bg-blue-100 text-blue-800 mr-3">Step 2</Badge>
                  <h4 className="text-lg font-medium">Copy Complete Setup SQL</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupSQL, 2)}
                >
                  {copiedStep === 2 ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copiedStep === 2 ? 'Copied!' : 'Copy SQL'}
                </Button>
              </div>
              <p className="text-gray-600 mb-3">
                Copy the complete SQL script from the <code>COMPLETE_SUPABASE_SETUP.sql</code> file in your project.
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                <div>-- COMPLETE LIFELINK SUPABASE SETUP</div>
                <div>-- This creates all tables, indexes, and RLS policies</div>
                <div>CREATE EXTENSION IF NOT EXISTS "uuid-ossp";</div>
                <div>CREATE EXTENSION IF NOT EXISTS "postgis";</div>
                <div>-- ... (complete script in COMPLETE_SUPABASE_SETUP.sql)</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center mb-4">
                <Badge className="bg-blue-100 text-blue-800 mr-3">Step 3</Badge>
                <h4 className="text-lg font-medium">Execute the SQL Script</h4>
              </div>
              <p className="text-gray-600 mb-3">
                In the Supabase SQL Editor:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-4">
                <li>Create a new query</li>
                <li>Paste the complete SQL script</li>
                <li>Click the "Run" button to execute</li>
                <li>Wait for completion (should show "Success")</li>
              </ol>
            </div>

            {/* Step 4 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Badge className="bg-green-100 text-green-800 mr-3">Step 4</Badge>
                  <h4 className="text-lg font-medium">Verify Setup</h4>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check Setup
                      </>
                    )}
                  </Button>
                  {onSkip && (
                    <Button
                      onClick={onSkip}
                      variant="outline"
                      disabled={isRetrying}
                    >
                      Skip Check
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-2">
                After running the SQL script, click "Check Setup" to verify everything was created correctly.
              </p>
              {onSkip && (
                <p className="text-sm text-gray-500">
                  Having issues? You can skip the setup check and proceed to the app. Make sure you've run the SQL script first.
                </p>
              )}
            </div>
          </div>

          {/* What gets created */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">What This Setup Creates:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Database Tables:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• profiles (user information)</li>
                  <li>• hospitals (medical facilities)</li>
                  <li>• blood_requests (donation requests)</li>
                  <li>• donations (donation records)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Features Enabled:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• User authentication & profiles</li>
                  <li>• Hospital management system</li>
                  <li>• Blood request matching</li>
                  <li>• Location-based services</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Need Help?</strong> If you encounter any issues:
              <br />
              • The "Failed to fetch" errors are normal before setup - they mean tables don't exist yet
              • Make sure you're in the correct Supabase project (lztzkuqpnnsubngplksk)
              • Check that the SQL ran without errors in the SQL Editor
              • Try refreshing the Supabase dashboard after running the script
              • Use "Skip Check" if you've run the script but the check keeps failing
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}