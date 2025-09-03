-- COMPLETE LIFELINK SUPABASE SETUP
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

-- ====================================================================
-- STEP 3: Create Indexes for Performance
-- ====================================================================

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

-- ====================================================================
-- STEP 4: Create Update Triggers
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_hospitals_updated_at ON public.hospitals;
DROP TRIGGER IF EXISTS update_blood_requests_updated_at ON public.blood_requests;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- STEP 5: Clean Up Any Existing Policies (avoid conflicts)
-- ====================================================================

-- Drop ALL existing policies to start fresh
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

-- Drop helper functions if they exist (these can cause recursion)
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_hospital_id(UUID);

-- ====================================================================
-- STEP 6: Set Up Simplified RLS (No Recursion)
-- ====================================================================

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

-- For hospital updates, we'll handle this in the application layer
CREATE POLICY "hospitals_authenticated_update" ON public.hospitals
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "hospitals_authenticated_delete" ON public.hospitals
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- BLOOD REQUESTS: Self-access and public read for active requests
CREATE POLICY "requests_self_access" ON public.blood_requests
    FOR ALL USING (requester_id = auth.uid());

CREATE POLICY "requests_public_read_active" ON public.blood_requests
    FOR SELECT USING (status = 'active');

-- Allow authenticated users to update/manage requests (app layer will enforce business rules)
CREATE POLICY "requests_authenticated_manage" ON public.blood_requests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DONATIONS: Self-access for donors
CREATE POLICY "donations_donor_access" ON public.donations
    FOR SELECT USING (donor_id = auth.uid());

-- Allow authenticated users to insert donations (app layer will enforce business rules)
CREATE POLICY "donations_authenticated_insert" ON public.donations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "donations_authenticated_read" ON public.donations
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ====================================================================
-- STEP 7: Grant Permissions
-- ====================================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.hospitals TO authenticated;
GRANT ALL ON public.blood_requests TO authenticated;
GRANT ALL ON public.donations TO authenticated;

-- ====================================================================
-- STEP 8: Insert Sample Data (Optional)
-- ====================================================================

-- Insert some sample hospitals for testing
INSERT INTO public.hospitals (name, address, contact_person_name, contact_info, license_number, status) VALUES
('City General Hospital', '123 Main St, Cityville', 'Dr. John Smith', 'contact@citygeneral.com', 'LIC001', 'approved'),
('Metro Medical Center', '456 Oak Ave, Downtown', 'Dr. Sarah Johnson', 'info@metromedical.com', 'LIC002', 'approved'),
('Regional Health Center', '789 Pine Rd, Suburbia', 'Dr. Mike Wilson', 'admin@regionalhealth.com', 'LIC003', 'pending_review')
ON CONFLICT (license_number) DO NOTHING;

-- ====================================================================
-- SETUP COMPLETE!
-- ====================================================================

-- Your database is now ready with:
-- ✅ All required tables with proper relationships
-- ✅ Simplified RLS policies that avoid recursion issues
-- ✅ Performance indexes
-- ✅ Automatic timestamp updates
-- ✅ Sample hospital data
-- ✅ Proper permissions for authenticated users

-- Next Steps:
-- 1. Update your Supabase environment variables in your React app
-- 2. Sign up for an account in your application
-- 3. If you need platform admin access, run: 
--    UPDATE public.profiles SET role = 'platform_admin' WHERE id = 'YOUR_USER_ID';
-- 4. Test all features - they should work without RLS recursion errors!