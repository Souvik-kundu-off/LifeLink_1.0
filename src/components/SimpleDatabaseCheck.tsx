import React, { useState } from 'react';
import { Database, ExternalLink, CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface SimpleDatabaseCheckProps {
  children: React.ReactNode;
  onBypass?: () => void;
}

export default function SimpleDatabaseCheck({ children, onBypass }: SimpleDatabaseCheckProps) {
  const [showSetup, setShowSetup] = useState(true);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const setupSQL = `-- COMPLETE LIFELINK SUPABASE SETUP
-- Run this entire script in your Supabase SQL Editor

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

-- Create hospitals table
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    contact_person_name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    application_date DATE DEFAULT CURRENT_DATE,
    status hospital_status_enum DEFAULT 'pending_review',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blood_requests table
CREATE TABLE IF NOT EXISTS public.blood_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_age INTEGER NOT NULL CHECK (patient_age >= 0 AND patient_age <= 150),
    blood_group_needed blood_group_enum NOT NULL,
    urgency urgency_enum NOT NULL,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    status request_status_enum DEFAULT 'pending_verification',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    donation_date DATE DEFAULT CURRENT_DATE,
    request_id UUID REFERENCES public.blood_requests(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for hospital_id in profiles (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_profiles_hospital'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_hospital 
            FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON public.profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_profiles_availability ON public.profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON public.hospitals(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital ON public.blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_urgency ON public.blood_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_hospital ON public.donations(hospital_id);

-- Create spatial indexes for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON public.hospitals USING GIST(location);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_hospitals_updated_at ON public.hospitals;
DROP TRIGGER IF EXISTS update_blood_requests_updated_at ON public.blood_requests;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean up any existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Hospital admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Hospital admins can view all individual profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view approved hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Platform admins can manage all hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Anyone can insert hospital applications" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_public_read" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_public_insert" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_authenticated_update" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_authenticated_delete" ON public.hospitals;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Anyone can view active requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Hospital admins can manage requests for their hospital" ON public.blood_requests;
DROP POLICY IF EXISTS "Platform admins can manage all requests" ON public.blood_requests;
DROP POLICY IF EXISTS "requests_self_access" ON public.blood_requests;
DROP POLICY IF EXISTS "requests_public_read_active" ON public.blood_requests;
DROP POLICY IF EXISTS "requests_authenticated_manage" ON public.blood_requests;

DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
DROP POLICY IF EXISTS "Hospital admins can view donations for their hospital" ON public.donations;
DROP POLICY IF EXISTS "Hospital admins can create donations for their hospital" ON public.donations;
DROP POLICY IF EXISTS "Platform admins can manage all donations" ON public.donations;
DROP POLICY IF EXISTS "donations_donor_access" ON public.donations;
DROP POLICY IF EXISTS "donations_authenticated_insert" ON public.donations;
DROP POLICY IF EXISTS "donations_authenticated_read" ON public.donations;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- PROFILES: Only basic self-access, no role-based cross-references
CREATE POLICY "profiles_self_access" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- HOSPITALS: Public read for approved, open insert, no complex role checks
CREATE POLICY "hospitals_public_read" ON public.hospitals
    FOR SELECT USING (status = 'approved');

CREATE POLICY "hospitals_public_insert" ON public.hospitals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "hospitals_authenticated_update" ON public.hospitals
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "hospitals_authenticated_delete" ON public.hospitals
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- BLOOD REQUESTS: Self-access and public read for active requests
CREATE POLICY "requests_self_access" ON public.blood_requests
    FOR ALL USING (requester_id = auth.uid());

CREATE POLICY "requests_public_read_active" ON public.blood_requests
    FOR SELECT USING (status = 'active');

CREATE POLICY "requests_authenticated_manage" ON public.blood_requests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DONATIONS: Self-access for donors
CREATE POLICY "donations_donor_access" ON public.donations
    FOR SELECT USING (donor_id = auth.uid());

CREATE POLICY "donations_authenticated_insert" ON public.donations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "donations_authenticated_read" ON public.donations
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.hospitals TO authenticated;
GRANT ALL ON public.blood_requests TO authenticated;
GRANT ALL ON public.donations TO authenticated;

-- Insert sample hospitals for testing
INSERT INTO public.hospitals (name, address, contact_person_name, contact_info, license_number, status) VALUES
('City General Hospital', '123 Main St, Cityville', 'Dr. John Smith', 'contact@citygeneral.com', 'LIC001', 'approved'),
('Metro Medical Center', '456 Oak Ave, Downtown', 'Dr. Sarah Johnson', 'info@metromedical.com', 'LIC002', 'approved'),
('Regional Health Center', '789 Pine Rd, Suburbia', 'Dr. Mike Wilson', 'admin@regionalhealth.com', 'LIC003', 'pending_review')
ON CONFLICT (license_number) DO NOTHING;

-- Setup complete!`;

  if (!showSetup) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-3xl">🩸 Lifelink Database Setup</CardTitle>
          <CardDescription className="text-lg">
            Welcome to Lifelink! Let's set up your blood donation platform database.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* No connectivity check - just show setup instructions */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Quick Setup Required:</strong> This is a one-time setup to create your database tables. 
              The process takes about 2 minutes and only needs to be done once.
            </AlertDescription>
          </Alert>

          {/* Simplified Steps */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">3 Simple Steps</h3>
              <div className="text-xs text-gray-500">
                Tip: Press Ctrl+Shift+D to skip setup
              </div>
            </div>
            
            {/* Step 1 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">1</div>
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
              <p className="text-gray-600">
                Go to your Supabase project and click on "SQL Editor" in the left sidebar.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">2</div>
                  <h4 className="text-lg font-medium">Copy & Run SQL Script</h4>
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
                Create a new query, paste the complete setup script, and click "Run".
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                <div>-- Creates all tables, indexes, and RLS policies</div>
                <div>CREATE EXTENSION IF NOT EXISTS "uuid-ossp";</div>
                <div>CREATE EXTENSION IF NOT EXISTS "postgis";</div>
                <div>-- ... (complete script above)</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">3</div>
                  <h4 className="text-lg font-medium">Launch Application</h4>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowSetup(false)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    I've Run the Script
                  </Button>
                  {onBypass && (
                    <Button
                      onClick={onBypass}
                      variant="outline"
                    >
                      Skip Setup
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-gray-600">
                After running the SQL script successfully, click "I've Run the Script" to launch your Lifelink application.
              </p>
            </div>
          </div>

          {/* What gets created */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">✅ What This Creates:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-green-800 mb-2">Database Tables:</h5>
                <ul className="space-y-1 text-green-700">
                  <li>• profiles (user accounts)</li>
                  <li>• hospitals (medical facilities)</li>
                  <li>• blood_requests (donation needs)</li>
                  <li>• donations (donation records)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-green-800 mb-2">Features Ready:</h5>
                <ul className="space-y-1 text-green-700">
                  <li>• User authentication</li>
                  <li>• Blood request system</li>
                  <li>• Hospital management</li>
                  <li>• Location services</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}