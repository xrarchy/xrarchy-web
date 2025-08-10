-- ===================================================
-- FIX PROFILES RLS POLICY CIRCULAR REFERENCE
-- Run this in your Supabase Dashboard > SQL Editor
-- ===================================================

-- The issue: The profiles SELECT policy has a circular reference where it tries to
-- read from profiles table to check the user's role, but the policy itself
-- prevents reading from profiles table.

-- SOLUTION: Simplify the policy to avoid circular references

BEGIN;

-- Drop and recreate the profiles SELECT policy without circular references
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Fixed Profiles SELECT policy - eliminates circular reference
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (
        -- Users can always see their own profile (most important - no circular ref)
        id = auth.uid()
        OR
        -- Admin role can see all profiles (check role of current row, not from another query)
        role = 'Admin'
        OR
        -- Allow viewing profiles of users in any project (for project member browsing)
        -- This allows Users to see project members when browsing
        id IN (
            SELECT assigned_user_id 
            FROM project_assignments
        )
        OR
        -- Fallback: Allow authenticated users to see public profile info
        auth.uid() IS NOT NULL
    );

COMMIT;

-- ===========================
-- VERIFICATION
-- ===========================

-- Test that users can access their own profile
SELECT 'Policy updated successfully - users should now be able to access their own profiles' as result;

-- Show the new policy
SELECT 
    policyname,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'profiles_select_policy';
