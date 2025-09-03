# Lifelink Database Setup Guide

## ⚠️ IMPORTANT: If you're getting RLS recursion errors, use SIMPLE_RLS_FIX.sql instead!

If you see "infinite recursion detected in policy" errors, skip this file and run the **SIMPLE_RLS_FIX.sql** script instead. It provides a simplified, non-recursive approach that works reliably.

## Required Database Schema

You need to run the following SQL statements in your Supabase SQL Editor to create the required tables and set up Row Level Security (RLS).

### 1. Create Tables

```sql
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
CREATE TABLE public.profiles (
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
CREATE TABLE public.hospitals (
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
CREATE TABLE public.blood_requests (
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
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    donation_date DATE DEFAULT CURRENT_DATE,
    request_id UUID REFERENCES public.blood_requests(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for hospital_id in profiles
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_hospital 
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_blood_group ON public.profiles(blood_group);
CREATE INDEX idx_profiles_availability ON public.profiles(availability_status);
CREATE INDEX idx_hospitals_status ON public.hospitals(status);
CREATE INDEX idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX idx_blood_requests_hospital ON public.blood_requests(hospital_id);
CREATE INDEX idx_blood_requests_urgency ON public.blood_requests(urgency);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_hospital ON public.donations(hospital_id);

-- Create spatial indexes for location queries
CREATE INDEX idx_profiles_location ON public.profiles USING GIST(location);
CREATE INDEX idx_hospitals_location ON public.hospitals USING GIST(location);
```

### 2. Create Helper Functions (to avoid RLS recursion)

```sql
-- Create security definer functions to bypass RLS for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role_enum
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $
  SELECT role FROM public.profiles WHERE id = user_id;
$;

CREATE OR REPLACE FUNCTION public.get_user_hospital_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $
  SELECT hospital_id FROM public.profiles WHERE id = user_id;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_hospital_id(UUID) TO authenticated;
```

### 3. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies (using functions to avoid recursion)
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Hospital admins can view all individual profiles" ON public.profiles
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_admin' 
        AND role = 'individual'
    );

CREATE POLICY "Platform admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.get_user_role(auth.uid()) = 'platform_admin');

-- Hospitals RLS Policies
CREATE POLICY "Anyone can view approved hospitals" ON public.hospitals
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Platform admins can manage all hospitals" ON public.hospitals
    FOR ALL USING (public.get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Anyone can insert hospital applications" ON public.hospitals
    FOR INSERT WITH CHECK (true);

-- Blood Requests RLS Policies
CREATE POLICY "Users can view their own requests" ON public.blood_requests
    FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Users can create requests" ON public.blood_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update their own requests" ON public.blood_requests
    FOR UPDATE USING (requester_id = auth.uid());

CREATE POLICY "Anyone can view active requests" ON public.blood_requests
    FOR SELECT USING (status = 'active');

CREATE POLICY "Hospital admins can manage requests for their hospital" ON public.blood_requests
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'hospital_admin' 
        AND public.get_user_hospital_id(auth.uid()) = hospital_id
    );

CREATE POLICY "Platform admins can manage all requests" ON public.blood_requests
    FOR ALL USING (public.get_user_role(auth.uid()) = 'platform_admin');

-- Donations RLS Policies
CREATE POLICY "Users can view their own donations" ON public.donations
    FOR SELECT USING (donor_id = auth.uid());

CREATE POLICY "Hospital admins can view donations for their hospital" ON public.donations
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_admin' 
        AND public.get_user_hospital_id(auth.uid()) = hospital_id
    );

CREATE POLICY "Hospital admins can create donations for their hospital" ON public.donations
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) = 'hospital_admin' 
        AND public.get_user_hospital_id(auth.uid()) = hospital_id
    );

CREATE POLICY "Platform admins can manage all donations" ON public.donations
    FOR ALL USING (public.get_user_role(auth.uid()) = 'platform_admin');
```

### 3. Create Triggers for Updated At

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Fix Existing Database (if you're getting recursion errors)

If you're seeing "infinite recursion detected in policy" errors, you have two options:

**Option A: Use the quick fix file**
Copy and run the complete SQL from `FIX_RLS_RECURSION.sql` file in your Supabase SQL Editor.

**Option B: Manual fix with individual statements**
If you're seeing "infinite recursion detected in policy" errors, you need to drop and recreate the policies:

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Hospital admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Hospital admins can view all individual profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view approved hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Platform admins can manage all hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Anyone can insert hospital applications" ON public.hospitals;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Anyone can view active requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Hospital admins can manage requests for their hospital" ON public.blood_requests;
DROP POLICY IF EXISTS "Platform admins can manage all requests" ON public.blood_requests;

DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
DROP POLICY IF EXISTS "Hospital admins can view donations for their hospital" ON public.donations;
DROP POLICY IF EXISTS "Hospital admins can create donations for their hospital" ON public.donations;
DROP POLICY IF EXISTS "Platform admins can manage all donations" ON public.donations;

-- Then run the helper functions and RLS policies from sections 2 and 3 above
```

### 5. Create Initial Admin User (Optional)

```sql
-- Insert a platform admin user (replace with your actual user ID after signing up)
-- First sign up normally, then run this query with your user ID:
-- UPDATE public.profiles SET role = 'platform_admin' WHERE id = 'YOUR_USER_ID_HERE';
```

## Setup Instructions

1. **Copy the SQL above** and run it in your Supabase SQL Editor
2. **Sign up** for an account in the application
3. **Update your role** to platform_admin if needed using the SQL Editor
4. **Test the application** - all features should now work correctly

## Verification

After running the SQL, you should see these tables in your Supabase Table Editor:
- `profiles`
- `hospitals` 
- `blood_requests`
- `donations`

Each table should have RLS enabled and appropriate policies configured.