-- Quick Fix for RLS Recursion Errors
-- Run this SQL in your Supabase SQL Editor if you're getting "infinite recursion detected in policy" errors

-- Step 1: Drop all existing problematic policies
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

-- Step 2: Create helper functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role_enum
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_hospital_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT hospital_id FROM public.profiles WHERE id = user_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_hospital_id(UUID) TO authenticated;

-- Step 3: Recreate policies using helper functions (no recursion)
-- Profiles RLS Policies
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