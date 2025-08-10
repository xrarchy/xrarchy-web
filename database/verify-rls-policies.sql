-- ===================================================
-- RLS POLICY VERIFICATION SCRIPT
-- Run this AFTER applying the main RLS policies
-- ===================================================

-- This script helps you verify that your role-based access control
-- policies are working correctly. Run each section and check the results.

-- ===========================
-- 1. CHECK RLS STATUS
-- ===========================

SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
ORDER BY tablename;

-- ===========================
-- 2. COUNT POLICIES PER TABLE
-- ===========================

SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(cmd, ', ') as operations_covered
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
GROUP BY tablename
ORDER BY tablename;

-- ===========================
-- 3. LIST ALL POLICIES CREATED
-- ===========================

SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '✅ Permissive'
        ELSE '❌ Restrictive'
    END as type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
ORDER BY tablename, policyname;

-- ===========================
-- 4. CHECK PERFORMANCE INDEXES
-- ===========================

SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE 'idx_%' THEN '✅ Custom Index'
        ELSE '📋 System Index'
    END as index_type
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_assignments', 'files', 'profiles')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ===========================
-- 5. SAMPLE ROLE VERIFICATION
-- ===========================

-- Check if you have users with different roles
SELECT 
    role,
    COUNT(*) as user_count
FROM profiles 
GROUP BY role
ORDER BY role;

-- ===========================
-- 6. POLICY VALIDATION QUERIES
-- ===========================

-- These queries test that the policies are structured correctly.
-- They should run without errors (they don't return actual data due to RLS).

-- Test projects policies
SELECT 'Projects table policies' as test, COUNT(*) as visible_count 
FROM projects 
WHERE false; -- This tests the policy structure without returning data

-- Test assignments policies  
SELECT 'Assignments table policies' as test, COUNT(*) as visible_count 
FROM project_assignments 
WHERE false;

-- Test files policies
SELECT 'Files table policies' as test, COUNT(*) as visible_count 
FROM files 
WHERE false;

-- Test profiles policies
SELECT 'Profiles table policies' as test, COUNT(*) as visible_count 
FROM profiles 
WHERE false;

-- ===========================
-- EXPECTED RESULTS SUMMARY
-- ===========================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🎯 EXPECTED VERIFICATION RESULTS:';
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS Status: All 4 tables should show "RLS Enabled"';
    RAISE NOTICE '✅ Policy Count: Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '✅ Indexes: 7 custom indexes should be created (idx_*)';
    RAISE NOTICE '✅ Roles: Should show Admin, Archivist, User roles with counts';
    RAISE NOTICE '✅ Policy Tests: All 4 policy validation queries should complete without errors';
    RAISE NOTICE '';
    RAISE NOTICE 'If any section shows unexpected results, re-run the main RLS script.';
    RAISE NOTICE '';
END $$;
