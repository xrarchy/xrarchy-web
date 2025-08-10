# Adding Geolocation Support to Projects

## Quick Setup (Manual)

Since the automated migration script couldn't run, you'll need to add the geolocation columns manually in your Supabase dashboard.

### Step 1: Add Geolocation Columns

Go to your Supabase Dashboard → SQL Editor and run this SQL:

```sql
-- Add geolocation columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS location_description TEXT;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_projects_location 
ON projects (latitude, longitude);

-- Add validation constraints
ALTER TABLE projects 
ADD CONSTRAINT IF NOT EXISTS chk_latitude 
CHECK (latitude >= -90 AND latitude <= 90);

ALTER TABLE projects 
ADD CONSTRAINT IF NOT EXISTS chk_longitude 
CHECK (longitude >= -180 AND longitude <= 180);
```

### Step 2: Test the New API

After adding the columns, you can test the enhanced project creation API:

**Admin Project Creation with Location:**
```json
{
  "name": "Colosseum AR Experience",
  "description": "Virtual reconstruction of ancient Colosseum",
  "location": {
    "latitude": 41.8902,
    "longitude": 12.4922,
    "name": "Colosseum",
    "address": "Piazza del Colosseo, 1, 00184 Roma RM, Italy",
    "description": "Ancient Roman amphitheatre in the centre of Rome"
  }
}
```

## Famous Locations for Testing

### Colosseum, Rome
- **Latitude:** 41.8902
- **Longitude:** 12.4922
- **Address:** Piazza del Colosseo, 1, 00184 Roma RM, Italy

### Eiffel Tower, Paris
- **Latitude:** 48.8584
- **Longitude:** 2.2945
- **Address:** Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France

### Great Wall of China
- **Latitude:** 40.4319
- **Longitude:** 116.5704
- **Address:** Huairou District, Beijing, China

### Machu Picchu, Peru
- **Latitude:** -13.1631
- **Longitude:** -72.5450
- **Address:** 08680 Machu Picchu, Cusco, Peru

### Taj Mahal, India
- **Latitude:** 27.1751
- **Longitude:** 78.0421
- **Address:** Dharmapuri, Forest Colony, Tajganj, Agra, India

## API Updates Completed

✅ **Admin API** (`/api/admin/projects`)
- Now accepts `location` object in POST requests
- Returns location data in responses
- Validates latitude/longitude ranges

✅ **Mobile API** (`/api/mobile/projects`)
- Returns location data for all projects
- Includes coordinates for map display

✅ **Postman Collection**
- Updated with geolocation examples
- Added coordinate variables for testing

## Next Steps

1. **Run the SQL** in your Supabase dashboard
2. **Test project creation** with location data using Postman
3. **Verify mobile API** returns location information
4. **Consider adding a map view** to your frontend to display project locations

## Frontend Integration Ideas

You could enhance your frontend to:

1. **Project Creation Form**: Add location picker with map
2. **Project List**: Show locations on a world map
3. **Project Details**: Display location info and map view
4. **Search/Filter**: Find projects near specific locations
5. **Mobile App**: Use GPS to find nearby projects

The API is now ready to support all these features!
