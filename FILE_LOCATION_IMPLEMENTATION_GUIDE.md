# File Location Support Implementation

## Overview
Added latitude and longitude support to the files table and APIs to enable location-based features for uploaded files.

## Database Changes

### New Columns Added to `files` table:
- `latitude` - DECIMAL(10, 8) - Latitude coordinate (-90 to 90)
- `longitude` - DECIMAL(11, 8) - Longitude coordinate (-180 to 180)
- Both columns are NULLABLE (optional)

### Migration Script
Run the migration: `database/add-location-to-files.sql`

## API Changes

### Web API (`/api/projects/[id]/files`)

#### GET - Retrieve Files
- Returns latitude and longitude in the response
- Example response:
```json
{
  "projectFiles": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "file_size": 1024000,
      "file_url": "projects/project-id/file.jpg",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "created_at": "2025-01-01T12:00:00Z",
      "uploaded_by": { "id": "user-id", "email": "user@example.com" }
    }
  ]
}
```

#### POST - Upload File with Location
- Accepts `latitude` and `longitude` as form data parameters
- Example upload:
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('latitude', '37.7749');
formData.append('longitude', '-122.4194');

fetch('/api/projects/project-id/files', {
  method: 'POST',
  body: formData
});
```

### Mobile API (`/api/mobile/projects/[id]/files`)

#### GET - Retrieve Files
- Returns location data in structured format
- Example response:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid",
        "name": "photo.jpg",
        "size": 1024000,
        "url": "projects/project-id/file.jpg",
        "location": {
          "latitude": 37.7749,
          "longitude": -122.4194
        },
        "uploadedAt": "2025-01-01T12:00:00Z",
        "uploadedBy": { "email": "user@example.com" }
      }
    ]
  }
}
```

#### POST - Upload File with Location
- Accepts `latitude` and `longitude` as form data parameters
- Mobile-optimized error messages
- Example upload:
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('latitude', '37.7749');
formData.append('longitude', '-122.4194');

fetch('/api/mobile/projects/project-id/files', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + authToken
  },
  body: formData
});
```

## Validation Rules

### Coordinate Validation
- **Latitude**: Must be between -90 and 90 degrees
- **Longitude**: Must be between -180 and 180 degrees
- **Optional**: Both coordinates can be null/omitted
- **Paired**: If one coordinate is provided, the other should be too (recommended)

### Error Responses
- Invalid coordinates return appropriate error messages
- Maintains backward compatibility - location is optional

## Use Cases

### 1. Photo Geotagging
- Store GPS coordinates from mobile device cameras
- Enable location-based file filtering and mapping

### 2. Field Data Collection
- Associate field measurements with precise locations
- Track where specific files were captured

### 3. Location-Based Features
- Map view of all files in a project
- Location-based file search and filtering
- Geofencing capabilities

## Frontend Integration Examples

### Web Form Upload with Location
```html
<form enctype="multipart/form-data">
  <input type="file" name="file" required />
  <input type="number" name="latitude" step="any" placeholder="Latitude" />
  <input type="number" name="longitude" step="any" placeholder="Longitude" />
  <button type="submit">Upload</button>
</form>
```

### Mobile App with GPS
```javascript
// Get current position
navigator.geolocation.getCurrentPosition((position) => {
  const formData = new FormData();
  formData.append('file', fileObject);
  formData.append('latitude', position.coords.latitude.toString());
  formData.append('longitude', position.coords.longitude.toString());
  
  // Upload with location
  uploadFile(formData);
});
```

### React Native Implementation
```javascript
import Geolocation from '@react-native-community/geolocation';

const uploadWithLocation = (file) => {
  Geolocation.getCurrentPosition(
    (position) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
      
      // API call
      uploadFile(formData);
    },
    (error) => {
      // Upload without location as fallback
      uploadFileWithoutLocation(file);
    }
  );
};
```

## Testing

### Test Cases
1. **Upload with valid coordinates** - Should succeed
2. **Upload without coordinates** - Should succeed (backward compatibility)
3. **Upload with invalid latitude** (>90 or <-90) - Should return 400 error
4. **Upload with invalid longitude** (>180 or <-180) - Should return 400 error
5. **Retrieve files with location data** - Should return location in response
6. **Retrieve files without location** - Should return null for location

### Sample Test Data
```javascript
// Valid coordinates
{ latitude: 37.7749, longitude: -122.4194 } // San Francisco
{ latitude: 40.7128, longitude: -74.0060 }  // New York
{ latitude: -33.8688, longitude: 151.2093 } // Sydney

// Invalid coordinates (should fail)
{ latitude: 91, longitude: 0 }       // Invalid latitude
{ latitude: 0, longitude: 181 }      // Invalid longitude
{ latitude: -91, longitude: -181 }   // Both invalid
```

## Security Considerations

### Data Privacy
- Location data is sensitive - ensure proper access controls
- Only authorized project members can see file locations
- Consider adding location data retention policies

### Access Control
- Same RLS policies apply to location data as file data
- Location data follows existing project assignment permissions

## Future Enhancements

### Potential Features
1. **Location-based search**: Find files within a radius
2. **Geofencing**: Auto-assign files to projects based on location
3. **Location clustering**: Group nearby files automatically
4. **Location history**: Track file location changes
5. **Address resolution**: Convert coordinates to human-readable addresses

### Database Optimizations
- Consider adding spatial indexes for location-based queries
- PostGIS extension for advanced spatial operations
- Location-based partitioning for large datasets

## Migration Notes

### Backward Compatibility
- ✅ Existing files will have NULL coordinates (no breaking changes)
- ✅ APIs continue to work without location parameters
- ✅ All existing functionality preserved

### Deployment Steps
1. Run database migration: `add-location-to-files.sql`
2. Deploy updated API code
3. Update frontend applications to support location
4. Test file upload/retrieval functionality
5. Update documentation and user guides

## API Documentation Updates

### OpenAPI/Swagger Changes
Update API documentation to include:
- New latitude/longitude parameters in POST requests
- Location data in GET response schemas
- Validation rules and error codes
- Example requests and responses with location data
