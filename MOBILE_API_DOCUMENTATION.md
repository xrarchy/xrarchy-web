# Mobile API Documentation

This document provides comprehensive documentation for the mobile API endpoints in the Archy XR Web application.

## Base URL
```
/api/mobile
```

## Authentication
All mobile API endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## File Management API

### 1. List Project Files
**GET** `/api/mobile/projects/{projectId}/files`

Get all files for a specific project with location data.

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file_id",
        "name": "example.pdf",
        "size": 1024,
        "url": "storage_url",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "uploadedAt": "2024-01-01T00:00:00Z",
        "uploadedBy": {
          "email": "user@example.com"
        }
      }
    ]
  }
}
```

### 2. Upload File to Project
**POST** `/api/mobile/projects/{projectId}/files`

Upload a new file to a project with optional location data.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (required): The file to upload
- `latitude` (optional): Latitude coordinate (-90 to 90)
- `longitude` (optional): Longitude coordinate (-180 to 180)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "id": "new_file_id",
      "name": "uploaded.pdf",
      "size": 1024,
      "url": "storage_url",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "uploadedAt": "2024-01-01T00:00:00Z",
      "uploadedBy": "user_id"
    }
  }
}
```

### 3. Get Single File Details
**GET** `/api/mobile/projects/{projectId}/files/{fileId}`

Get details for a specific file.

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file_id",
      "name": "example.pdf",
      "size": 1024,
      "url": "storage_url",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "uploadedAt": "2024-01-01T00:00:00Z",
      "uploadedBy": {
        "email": "user@example.com"
      }
    }
  }
}
```

### 4. Update File Metadata (Partial Update)
**PUT** `/api/mobile/projects/{projectId}/files/{fileId}`

Update file metadata. Only send the fields you want to update.

**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "file_name": "new_name.pdf"
}
```

**Notes:**
- You can update only one field at a time or multiple fields
- Set `latitude` or `longitude` to `null` to remove location data
- Only file owner or admin can update files
- Coordinates are validated: latitude (-90 to 90), longitude (-180 to 180)

**Response:**
```json
{
  "success": true,
  "message": "File updated successfully",
  "data": {
    "file": {
      "id": "file_id",
      "name": "new_name.pdf",
      "size": 1024,
      "url": "storage_url",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "uploadedAt": "2024-01-01T00:00:00Z",
      "uploadedBy": "user_id"
    },
    "updatedFields": ["latitude", "longitude", "file_name"]
  }
}
```

### 5. Delete File
**DELETE** `/api/mobile/projects/{projectId}/files/{fileId}`

Delete a file from the project and storage.

**Notes:**
- Only file owner or admin can delete files
- File is removed from both database and storage

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "deletedFile": {
      "id": "file_id",
      "name": "deleted_file.pdf"
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

#### Authentication Errors
- `MISSING_AUTH_HEADER` (401): Authorization header required
- `INVALID_TOKEN` (401): Invalid or expired token

#### Permission Errors
- `PROJECT_ACCESS_DENIED` (403): User doesn't have access to the project
- `UPDATE_PERMISSION_DENIED` (403): User can only update their own files
- `DELETE_PERMISSION_DENIED` (403): User can only delete their own files

#### Validation Errors
- `INVALID_LATITUDE` (400): Latitude must be between -90 and 90
- `INVALID_LONGITUDE` (400): Longitude must be between -180 and 180
- `INVALID_FILE_NAME` (400): File name cannot be empty
- `NO_UPDATE_FIELDS` (400): No valid fields provided for update

#### Resource Errors
- `FILE_NOT_FOUND` (404): File not found in the project
- `PROJECT_NOT_FOUND` (404): Project not found

#### Server Errors
- `PROFILE_FETCH_ERROR` (500): Failed to fetch user profile
- `UPLOAD_ERROR` (500): Failed to upload file
- `UPDATE_ERROR` (500): Failed to update file
- `DELETE_ERROR` (500): Failed to delete file
- `SERVER_ERROR` (500): Internal server error

## Usage Examples

### Upload file with location
```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('latitude', '40.7128');
formData.append('longitude', '-74.0060');

const response = await fetch('/api/mobile/projects/123/files', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### Update only longitude
```javascript
const response = await fetch('/api/mobile/projects/123/files/456', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    longitude: -74.0060
  })
});
```

### Remove location data
```javascript
const response = await fetch('/api/mobile/projects/123/files/456', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: null,
    longitude: null
  })
});
```

### Delete file
```javascript
const response = await fetch('/api/mobile/projects/123/files/456', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

## API Conventions

1. **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Consistent Responses**: All responses include `success` boolean and appropriate data/error fields
3. **Mobile Optimized**: Responses are optimized for mobile consumption with relevant data only
4. **Partial Updates**: PUT operations support partial updates - only send changed fields
5. **Proper Status Codes**: HTTP status codes reflect the actual response state
6. **Authentication Required**: All endpoints require valid authentication
7. **Permission Checks**: Operations respect user roles and file ownership
