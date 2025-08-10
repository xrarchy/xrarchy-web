-- Add geolocation fields to projects table
-- This script adds latitude, longitude, location_name, and address fields to enable project geolocation

-- Add new columns for geolocation
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS location_description TEXT;

-- Add indexes for geolocation queries (useful for finding nearby projects)
CREATE INDEX IF NOT EXISTS idx_projects_location 
ON projects (latitude, longitude);

-- Add a check constraint to ensure valid latitude/longitude ranges
-- Note: PostgreSQL doesn't support IF NOT EXISTS for constraints, so we'll use DO blocks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'projects' AND constraint_name = 'chk_latitude') THEN
        ALTER TABLE projects ADD CONSTRAINT chk_latitude 
        CHECK (latitude >= -90 AND latitude <= 90);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'projects' AND constraint_name = 'chk_longitude') THEN
        ALTER TABLE projects ADD CONSTRAINT chk_longitude 
        CHECK (longitude >= -180 AND longitude <= 180);
    END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN projects.latitude IS 'Latitude coordinate (decimal degrees, -90 to 90)';
COMMENT ON COLUMN projects.longitude IS 'Longitude coordinate (decimal degrees, -180 to 180)';
COMMENT ON COLUMN projects.location_name IS 'Human-readable location name (e.g., "Colosseum", "Eiffel Tower")';
COMMENT ON COLUMN projects.address IS 'Full address of the project location';
COMMENT ON COLUMN projects.location_description IS 'Additional description about the location context';
