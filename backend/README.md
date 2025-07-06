# AI Companion Backend

A secure Node.js backend for the AI Companion mobile application, built with Express.js, Firebase Admin SDK, and comprehensive security features.

## Features

- 🔐 **Authentication**: Firebase Admin SDK integration
- 🛡️ **Security**: Rate limiting, input validation, CORS protection, security headers
- 📊 **Database**: Firestore integration for data persistence
- 🔔 **Notifications**: Firebase Cloud Messaging (FCM) support
- 👥 **User Management**: Create, update, delete users with custom claims
- 🏪 **Marketplace**: Product management with CRUD operations
- 👨‍🏫 **Mentors**: Mentor profiles and session booking
- 🧪 **Prototypes**: Prototype sharing and feedback system

## Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Joi schemas for all API endpoints
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js for enhanced security
- **Environment Validation**: Ensures required variables are set
- **Request Size Limits**: Prevents large payload attacks

## Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Firebase project with Admin SDK service account

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend directory with the following variables:

   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000

   # Firebase Configuration (Required)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006,http://localhost:8081

   # Rate Limiting Configuration
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Security Configuration (Optional for development)
   JWT_SECRET=your-jwt-secret-key
   SESSION_SECRET=your-session-secret

   # Logging Configuration
   LOG_LEVEL=info

   # Feature Flags
   ENABLE_RATE_LIMITING=true
   ENABLE_CORS=true
   ENABLE_HELMET=true
   ```

3. **Get Firebase Service Account:**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Extract the values and add them to your `.env` file

### Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## API Endpoints

### Authentication & Users
- `POST /api/users/create` - Create new user (admin only)
- `POST /api/users/set-claims` - Set custom claims (admin only)
- `GET /api/users/:uid` - Get user details
- `DELETE /api/users/:uid` - Delete user (admin only)

### Marketplace
- `GET /api/marketplace` - Get all marketplace items
- `GET /api/marketplace/:id` - Get specific item
- `POST /api/marketplace` - Create new item
- `PUT /api/marketplace/:id` - Update item
- `DELETE /api/marketplace/:id` - Delete item

### Mentors
- `GET /api/mentors` - Get all mentors
- `GET /api/mentors/:id` - Get specific mentor
- `POST /api/mentors/book` - Book mentor session

### Prototypes
- `GET /api/prototypes` - Get all prototypes
- `GET /api/prototypes/:id` - Get specific prototype
- `POST /api/prototypes` - Create new prototype
- `POST /api/prototypes/:id/feedback` - Submit feedback

### Notifications
- `POST /api/notifications/send-to-device` - Send to specific device
- `POST /api/notifications/send-to-topic` - Send to topic subscribers

## Security Configuration

### Rate Limiting
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- User creation: 10 requests per hour

### CORS
- Configured for development servers
- Add production domains to `ALLOWED_ORIGINS`

### Input Validation
- All POST/PUT requests validated with Joi schemas
- Automatic sanitization of input data
- Detailed error messages for validation failures

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Environment mode | `development` |
| `PORT` | No | Server port | `3000` |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID | - |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account private key | - |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account email | - |
| `ALLOWED_ORIGINS` | No | CORS allowed origins | Localhost URLs |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window | `100` |
| `ENABLE_RATE_LIMITING` | No | Enable rate limiting | `true` |
| `ENABLE_CORS` | No | Enable CORS | `true` |
| `ENABLE_HELMET` | No | Enable security headers | `true` |

## Production Deployment

1. **Set environment variables** for production
2. **Update CORS origins** to your production domains
3. **Enable all security features**
4. **Set up monitoring** (Sentry, etc.)
5. **Configure reverse proxy** (nginx, etc.)
6. **Set up SSL/TLS** certificates

## Health Check

The server provides a health check endpoint:
```bash
GET /health
```

Returns server status, uptime, and environment information.

## Error Handling

All errors are standardized with consistent format:
```json
{
  "error": "Error type",
  "message": "Human readable message",
  "details": "Additional error details"
}
```

## Contributing

1. Follow the existing code structure
2. Add input validation for new endpoints
3. Include error handling
4. Update documentation
5. Test thoroughly 

## API Documentation

Interactive API docs are available at:

```
GET /api-docs
```

Open [http://localhost:5000/api-docs](http://localhost:5000/api-docs) in your browser after starting the server.

## Deployment

- Set all required environment variables in your production environment.
- Use a process manager (e.g., PM2, Docker, systemd) for reliability.
- Ensure HTTPS is enabled in production.
- Monitor logs and errors (Winston logs to files, Sentry for error tracking).

## Contributing

PRs and issues welcome! 