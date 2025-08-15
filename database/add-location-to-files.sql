-- Add latitude and longitude columns to files table
-- This will allow storing location data with each uploaded file

-- First, let's check if the columns already exist
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

    -- Add height column if it doesn't exist (optional float for file capture height)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND table_schema = 'public' 
        AND column_name = 'height'
    ) THEN
        ALTER TABLE public.files
        ADD COLUMN height DECIMAL(8,4) DEFAULT NULL;
        RAISE NOTICE 'Added height column to files table';
    ELSE
        RAISE NOTICE 'Height column already exists in files table';
    END IF;

    -- Add rotation column if it doesn't exist (degrees, 0-360)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND table_schema = 'public' 
        AND column_name = 'rotation'
    ) THEN
        ALTER TABLE public.files
        ADD COLUMN rotation DECIMAL(7,4) DEFAULT NULL;
        RAISE NOTICE 'Added rotation column to files table';
    ELSE
        RAISE NOTICE 'Rotation column already exists in files table';
    END IF;

    -- Add comments to document the columns
    IF NOT lat_exists THEN
        COMMENT ON COLUMN public.files.latitude IS 'Latitude coordinate where the file was captured/created (optional)';
    END IF;
    
    IF NOT lng_exists THEN
        COMMENT ON COLUMN public.files.longitude IS 'Longitude coordinate where the file was captured/created (optional)';
    END IF;
    -- Comments for new fields
    COMMENT ON COLUMN public.files.height IS 'Optional capture height (meters) for the file (decimal)';
    COMMENT ON COLUMN public.files.rotation IS 'Optional rotation in degrees (0-360) for the file (decimal)';

END $$;

-- Display the updated table structure
SELECT column_name, data_type, is_nullable, column_default, 
       CASE WHEN column_comment IS NOT NULL THEN column_comment ELSE '' END as description
FROM information_schema.columns 
WHERE table_name = 'files' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add CHECK constraints for height and rotation if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_files_height_nonnegative' AND t.relname = 'files'
    ) THEN
        ALTER TABLE public.files
            ADD CONSTRAINT chk_files_height_nonnegative CHECK (height IS NULL OR height >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_files_rotation_range' AND t.relname = 'files'
    ) THEN
        ALTER TABLE public.files
            ADD CONSTRAINT chk_files_rotation_range CHECK (rotation IS NULL OR (rotation >= 0 AND rotation <= 360));
    END IF;
END$$;
