-- Temporary fix: Remove foreign key constraint on profiles table to allow profile creation
-- This is needed when Supabase Auth system has connectivity issues
-- IMPORTANT: Run this in your Supabase SQL Editor manually

-- First, check what constraints exist on the profiles table
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'profiles';

-- Remove the foreign key constraint from profiles.id to auth.users.id
-- This allows creating profiles without corresponding auth users (temporary workaround)
DO $$ 
BEGIN
    -- Try common constraint names
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Removed profiles_id_fkey constraint';
    ELSE
        RAISE NOTICE 'profiles_id_fkey constraint not found';
    END IF;
    
    -- Alternative constraint names
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey1' 
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey1;
        RAISE NOTICE 'Removed profiles_id_fkey1 constraint';
    END IF;
    
    -- Try generic patterns
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'profiles'
        AND table_schema = 'public'
        AND constraint_name LIKE '%id%'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_rec.constraint_name;
        RAISE NOTICE 'Removed constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Verify constraints are removed
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'profiles';

-- Show current profiles table structure
\d profiles;
