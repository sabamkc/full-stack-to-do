# Testing Auth Endpoints

Test the authentication endpoints with these curl commands or import into your REST client.

## Base URL
```
http://localhost:3000/api/v1/auth
```

## 1. Register New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "displayName": "Test User"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "displayName": "Test User",
      "photoURL": null,
      "createdAt": "2026-01-02T10:30:00.000Z"
    }
  }
}
```

## 2. Login User

First, obtain an ID token from Firebase on the client side. For testing, you can use Firebase's signInWithEmailAndPassword and get the idToken.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "idToken": "YOUR_FIREBASE_ID_TOKEN_HERE"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "displayName": "Test User",
      "photoURL": null,
      "lastLogin": "2026-01-02T10:35:00.000Z"
    }
  }
}
```

## 3. Get Current User (Protected)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "displayName": "Test User",
      "photoURL": null,
      "emailVerified": false,
      "lastLogin": "2026-01-02T10:35:00.000Z",
      "createdAt": "2026-01-02T10:30:00.000Z",
      "updatedAt": "2026-01-02T10:30:00.000Z"
    }
  }
}
```

## 4. Update Profile (Protected)

```bash
curl -X PATCH http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated User Name",
    "photoURL": "https://example.com/photo.jpg"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "displayName": "Updated User Name",
      "photoURL": "https://example.com/photo.jpg",
      "updatedAt": "2026-01-02T10:40:00.000Z"
    }
  }
}
```

## 5. Logout (Protected)

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Error Responses

### 400 - Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "error": "Invalid authentication token",
  "code": "UNAUTHORIZED",
  "statusCode": 401
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "User not found",
  "code": "NOT_FOUND",
  "statusCode": 404
}
```

### 409 - Conflict
```json
{
  "success": false,
  "error": "Email already registered",
  "code": "CONFLICT",
  "statusCode": 409
}
```

## Notes for Testing

1. **Firebase ID Token**: To obtain a Firebase ID token for testing:
   - Use Firebase's REST API for testing
   - Or use the Firebase SDK in a simple HTML page
   - Or use a testing tool like Firebase Auth Emulator

2. **Token Expiration**: Firebase ID tokens expire after 1 hour. Get a new token if requests fail with 401.

3. **Register Flow**: The /register endpoint creates both:
   - A user in Firebase Authentication
   - A corresponding record in PostgreSQL database

4. **Login Flow**: The /login endpoint expects:
   - User to already be authenticated with Firebase (have an ID token)
   - Updates last_login in the database

5. **Protected Routes**: All routes except /register and /login require the `Authorization: Bearer <token>` header.

## Testing with Postman/Insomnia

Create a collection with these requests and use environment variables:
- `{{baseURL}}`: http://localhost:3000/api/v1/auth
- `{{idToken}}`: Your Firebase ID token (update after login)

## Health Check

First verify the server is running:

```bash
curl http://localhost:3000/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-02T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "checks": {
    "database": "connected",
    "firebase": "initialized"
  }
}
```
