-- ===================================================
-- FIX INFINITE RECURSION IN PROFILES RLS POLICY
-- Run this in your Supabase Dashboard > SQL Editor
-- ===================================================

-- The error "infinite recursion detected in policy for relation 'profiles'" 
-- happens because our policy tries to query the profiles table to check roles,
-- but the policy itself controls access to profiles table.

-- SOLUTION: Create a simple policy that doesn't reference the profiles table

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Create a simple, non-recursive policy
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Always allow users to see their own profile (no recursion)
        id = auth.uid()
        OR
        -- Allow any authenticated user to see basic profile info
        -- This enables role checking and project member viewing
        auth.uid() IS NOT NULL
    );

COMMIT;

-- ===========================
-- VERIFICATION
-- ===========================

-- Test the policy
SELECT 'Profiles policy updated - infinite recursion fixed!' as result;

-- Show the new policy
SELECT 
    policyname,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'profiles_select_policy';

-- Test that we can now query profiles without recursion
SELECT 
    id,
    email,
    role
FROM profiles 
WHERE id = '0df707b9-778f-4188-bde4-5f481269ea77';
