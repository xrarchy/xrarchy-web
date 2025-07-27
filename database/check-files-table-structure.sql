-- Check the current structure of the files table
-- Run this in Supabase SQL Editor

-- 1. Check the files table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'files' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if project_name column exists and its constraints
SELECT 
    column_name,
    is_nullable,
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'files' 
AND column_name = 'project_name';

-- 3. Get the project name for our test
SELECT id, name FROM projects WHERE id = '7d827a85-2424-4a73-8ae2-826e4fab094f';