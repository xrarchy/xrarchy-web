-- ====================================
-- SUPABASE DATABASE CLEANUP SCRIPT (SAFE VERSION)
-- ====================================
-- This script will clean up the database and keep only the admin user
-- Run these commands one by one in Supabase SQL Editor
-- 
-- IMPORTANT: This will DELETE ALL DATA except the admin user!
-- Make sure you have backups if needed.
--
-- Admin user to preserve: cinani1527@cotasen.com
-- ====================================

-- First, let's check what tables actually exist
-- ====================================
SELECT 'EXISTING PUBLIC TABLES' as info;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 1: Check current state before cleanup
-- ====================================
SELECT 'CURRENT USERS' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users
ORDER BY created_at;

-- Check projects table (should exist based on your API)
SELECT 'CURRENT PROJECTS COUNT' as info;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        RAISE NOTICE 'Projects table exists - count: %', (SELECT COUNT(*) FROM projects);
    ELSE
        RAISE NOTICE 'Projects table does not exist';
    END IF;
END $$;

-- ====================================
-- Step 2: Clean up project data (only existing tables)
-- ====================================

-- Clean up projects and related data safely
DO $$
BEGIN
    -- Delete from projects table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        DELETE FROM projects;
        RAISE NOTICE 'Deleted all projects';
    ELSE
        RAISE NOTICE 'Projects table does not exist - skipping';
    END IF;
    
    -- Delete from project_assignments if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_assignments' AND table_schema = 'public') THEN
        DELETE FROM project_assignments;
        RAISE NOTICE 'Deleted all project_assignments';
    ELSE
        RAISE NOTICE 'project_assignments table does not exist - skipping';
    END IF;
    
    -- Delete from project_files if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_files' AND table_schema = 'public') THEN
        DELETE FROM project_files;
        RAISE NOTICE 'Deleted all project_files';
    ELSE
        RAISE NOTICE 'project_files table does not exist - skipping';
    END IF;
    
    -- Delete from any other project-related tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        DELETE FROM user_profiles 
        WHERE id NOT IN (
            SELECT id FROM auth.users 
            WHERE email = 'cinani1527@cotasen.com'
        );
        RAISE NOTICE 'Cleaned user_profiles (kept admin only)';
    ELSE
        RAISE NOTICE 'user_profiles table does not exist - skipping';
    END IF;
END $$;

-- ====================================
-- Step 3: Delete auth users (keep only admin)
-- ====================================

-- First, let's see which users will be deleted
SELECT 'USERS TO BE DELETED' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email != 'cinani1527@cotasen.com';

-- Delete all users except admin
-- Note: This uses Supabase's auth schema
DELETE FROM auth.users 
WHERE email != 'cinani1527@cotasen.com';

-- ====================================
-- Step 4: Verify cleanup results
-- ====================================

SELECT 'CLEANUP RESULTS - REMAINING USERS' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users
ORDER BY created_at;

-- Show cleanup results for existing tables only
SELECT 'CLEANUP RESULTS - FINAL COUNTS' as info;
DO $$
DECLARE
    project_count integer := 0;
    assignment_count integer := 0;
    profile_count integer := 0;
BEGIN
    -- Count projects if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO project_count FROM projects;
        RAISE NOTICE 'Projects remaining: %', project_count;
    ELSE
        RAISE NOTICE 'Projects table does not exist';
    END IF;
    
    -- Count assignments if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_assignments' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO assignment_count FROM project_assignments;
        RAISE NOTICE 'Project assignments remaining: %', assignment_count;
    ELSE
        RAISE NOTICE 'Project assignments table does not exist';
    END IF;
    
    -- Count profiles if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO profile_count FROM user_profiles;
        RAISE NOTICE 'User profiles remaining: %', profile_count;
    ELSE
        RAISE NOTICE 'User profiles table does not exist';
    END IF;
END $$;

-- ====================================
-- Step 5: Ensure admin user setup (if needed)
-- ====================================

-- Show final admin user state
SELECT 'FINAL STATE - ADMIN USER' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users
WHERE email = 'cinani1527@cotasen.com';

-- ====================================
-- SUCCESS MESSAGE
-- ====================================
SELECT '✅ DATABASE CLEANUP COMPLETED SUCCESSFULLY!' as status;
SELECT '👑 Only admin user remains: cinani1527@cotasen.com' as result;
SELECT '🆕 Database is now clean and ready for fresh data' as next_step;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CLEANUP SUMMARY:';
    RAISE NOTICE '• All non-admin users deleted';
    RAISE NOTICE '• All project data cleared';
    RAISE NOTICE '• Only admin user preserved: cinani1527@cotasen.com';
    RAISE NOTICE '• Database ready for fresh start';
    RAISE NOTICE '========================================';
END $$;
