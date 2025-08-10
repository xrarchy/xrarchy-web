-- Check the actual schema of the files table
-- This will help us understand what columns are available

-- Get column information for the files table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'files' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Alternative: Get all columns with a simple SELECT * LIMIT 0
-- This will show us the column structure without returning data
-- SELECT * FROM files LIMIT 0;
