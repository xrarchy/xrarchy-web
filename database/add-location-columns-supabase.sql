-- Add latitude and longitude columns to files table
-- Run this query in Supabase SQL Editor

DO $$ 
DECLARE
    lat_exists boolean;
    lng_exists boolean;
BEGIN
    -- Check if latitude column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND table_schema = 'public' 
        AND column_name = 'latitude'
    ) INTO lat_exists;

    -- Check if longitude column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND table_schema = 'public' 
        AND column_name = 'longitude'
    ) INTO lng_exists;

    -- Add latitude column if it doesn't exist
    IF NOT lat_exists THEN
        ALTER TABLE public.files 
        ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL;
        RAISE NOTICE 'Added latitude column to files table';
    ELSE
        RAISE NOTICE 'Latitude column already exists in files table';
    END IF;

    -- Add longitude column if it doesn't exist
    IF NOT lng_exists THEN
        ALTER TABLE public.files 
        ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL;
        RAISE NOTICE 'Added longitude column to files table';
    ELSE
        RAISE NOTICE 'Longitude column already exists in files table';
    END IF;

    -- Add comments to document the columns
    IF NOT lat_exists THEN
        COMMENT ON COLUMN public.files.latitude IS 'Latitude coordinate where the file was captured/created (optional, -90 to 90)';
    END IF;
    
    IF NOT lng_exists THEN
        COMMENT ON COLUMN public.files.longitude IS 'Longitude coordinate where the file was captured/created (optional, -180 to 180)';
    END IF;

END $$;

-- Verify the updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('latitude', 'longitude') THEN '🆕 NEW'
        ELSE ''
    END as status
FROM information_schema.columns 
WHERE table_name = 'files' 
AND table_schema = 'public'
ORDER BY ordinal_position;
