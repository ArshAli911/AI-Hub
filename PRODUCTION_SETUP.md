# AI-Hub Production Environment Setup Guide

This guide will walk you through setting up the AI-Hub project for production deployment.

## Prerequisites

- Google Cloud Platform account
- Firebase account
- Stripe account
- Sentry account
- Domain name (optional but recommended)
- SSL certificates

## Step 1: Firebase Production Project Setup

### 1.1 Create Firebase Production Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `ai-hub-prod`
4. Enable Google Analytics (recommended)
5. Choose analytics account or create new one
6. Click "Create project"

### 1.2 Configure Firebase Services

#### Authentication
1. Go to Authentication > Sign-in method
2. Enable Email/Password authentication
3. Configure additional providers as needed (Google, Apple, etc.)
4. Set up authorized domains

#### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select location closest to your users
5. Set up security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public data can be read by anyone
    match /prototypes/{prototypeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Mentors can be read by anyone, written by authenticated users
    match /mentors/{mentorId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

#### Storage
1. Go to Storage
2. Click "Get started"
3. Choose "Start in production mode"
4. Set up security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 1.3 Get Firebase Configuration

1. Go to Project Settings
2. Scroll down to "Your apps"
3. Add Android app:
   - Package name: `com.aihub.app`
   - Download `google-services.json`
4. Add iOS app:
   - Bundle ID: `com.aihub.app`
   - Download `GoogleService-Info.plist`

### 1.4 Create Service Account

1. Go to Project Settings > Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values for environment variables

## Step 2: Stripe Production Configuration

### 2.1 Create Stripe Production Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Switch to "Live" mode (not test mode)
3. Note your publishable and secret keys

### 2.2 Configure Products and Prices

1. Go to Products
2. Create products for:
   - Mentor sessions (hourly rate)
   - Premium subscriptions
   - One-time purchases

### 2.3 Set Up Webhooks

1. Go to Developers > Webhooks
2. Add endpoint: `https://api.ai-hub.com/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook secret

### 2.4 Configure Customer Portal

1. Go to Settings > Customer Portal
2. Configure the portal settings
3. Copy the portal URL

## Step 3: Sentry Production Setup

### 3.1 Create Sentry Project

1. Go to [Sentry](https://sentry.io/)
2. Create new organization or use existing
3. Create new project: `ai-hub-prod`
4. Select React Native as platform

### 3.2 Get DSN and Auth Token

1. Copy the DSN from project settings
2. Go to Settings > Auth Tokens
3. Create new token with project:write scope
4. Copy the token

### 3.3 Configure Release Tracking

1. Set up release tracking in your CI/CD pipeline
2. Configure source maps upload
3. Set up performance monitoring

## Step 4: Environment Variables Configuration

### 4.1 Copy Environment Template

```bash
cp env.production.template .env.production
```

### 4.2 Fill in Firebase Values

Replace the Firebase values in `.env.production`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC... # From Firebase config
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=ai-hub-prod.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ai-hub-prod
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=ai-hub-prod.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abcdef
```

### 4.3 Fill in Firebase Admin SDK Values

From the downloaded service account JSON:

```env
FIREBASE_ADMIN_PROJECT_ID=ai-hub-prod
FIREBASE_ADMIN_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nActual private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ai-hub-prod.iam.gserviceaccount.com
FIREBASE_ADMIN_CLIENT_ID=your_client_id
```

### 4.4 Fill in Stripe Values

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # From Stripe dashboard
STRIPE_SECRET_KEY=sk_live_... # From Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook settings
```

### 4.5 Fill in Sentry Values

```env
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/project_id # From Sentry project
SENTRY_ORG=your_org_name
SENTRY_PROJECT=ai-hub-prod
SENTRY_AUTH_TOKEN=your_auth_token # From Sentry auth tokens
```

### 4.6 Generate Security Keys

Generate secure random keys:

```bash
# Generate encryption key (32 characters)
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64

# Generate API key
openssl rand -base64 32
```

## Step 5: SSL Certificates and Domain Setup

### 5.1 Domain Configuration

1. Purchase domain (e.g., `ai-hub.com`)
2. Set up DNS records:
   ```
   A     api.ai-hub.com     -> Your server IP
   A     ws.ai-hub.com      -> Your server IP
   CNAME  www.ai-hub.com    -> ai-hub.com
   ```

### 5.2 SSL Certificates

1. Use Let's Encrypt for free SSL certificates
2. Or purchase certificates from your hosting provider
3. Configure certificates for:
   - `api.ai-hub.com`
   - `ws.ai-hub.com`
   - `ai-hub.com`

## Step 6: Server Setup

### 6.1 Choose Hosting Provider

Recommended options:
- **Google Cloud Platform** (with Firebase)
- **AWS** (with Route 53 and CloudFront)
- **DigitalOcean** (cost-effective)
- **Heroku** (easy deployment)

### 6.2 Server Requirements

Minimum specifications:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 20.04 LTS

### 6.3 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 6.4 Configure Nginx

Create `/etc/nginx/sites-available/ai-hub`:

```nginx
server {
    listen 80;
    server_name api.ai-hub.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name ws.ai-hub.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6.5 Get SSL Certificates

```bash
sudo certbot --nginx -d api.ai-hub.com -d ws.ai-hub.com
```

## Step 7: Database Setup

### 7.1 Firestore Configuration

Firestore is already configured in Firebase. Ensure:
- Security rules are properly set
- Indexes are created for complex queries
- Backup is enabled

### 7.2 Additional Database (Optional)

If you need additional database:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql
CREATE DATABASE ai_hub_prod;
CREATE USER ai_hub_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_hub_prod TO ai_hub_user;
\q
```

## Step 8: Deployment

### 8.1 Backend Deployment

1. Clone repository to server
2. Install dependencies:
   ```bash
   cd backend
   npm install --production
   ```

3. Copy environment file:
   ```bash
   cp .env.production .env
   ```

4. Start with PM2:
   ```bash
   pm2 start src/server.ts --name "ai-hub-backend"
   pm2 save
   pm2 startup
   ```

### 8.2 Frontend Build

1. Build for production:
   ```bash
   npm run build:android
   npm run build:ios
   ```

2. Upload to app stores or distribute APK/IPA files

## Step 9: Monitoring and Maintenance

### 9.1 Set Up Monitoring

1. Configure Sentry alerts
2. Set up server monitoring (CPU, RAM, disk)
3. Configure log aggregation
4. Set up uptime monitoring

### 9.2 Backup Strategy

1. Enable Firestore backup
2. Set up database backups
3. Configure file storage backups
4. Test restore procedures

### 9.3 Security Measures

1. Configure firewall rules
2. Set up intrusion detection
3. Enable rate limiting
4. Configure security headers
5. Set up regular security updates

## Step 10: Testing Production Setup

### 10.1 Smoke Tests

1. Test API endpoints
2. Test authentication
3. Test file uploads
4. Test payments
5. Test real-time features

### 10.2 Load Testing

1. Test with realistic user load
2. Monitor performance metrics
3. Optimize bottlenecks
4. Scale resources as needed

## Troubleshooting

### Common Issues

1. **Firebase Connection Errors**
   - Verify API keys
   - Check project ID
   - Ensure services are enabled

2. **Stripe Payment Failures**
   - Verify webhook endpoint
   - Check webhook secret
   - Test with Stripe CLI

3. **Sentry Not Working**
   - Verify DSN
   - Check auth token
   - Ensure source maps are uploaded

4. **SSL Certificate Issues**
   - Check domain configuration
   - Verify certificate installation
   - Test with SSL checker

### Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Sentry Documentation](https://docs.sentry.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Security Checklist

- [ ] Environment variables are secure
- [ ] SSL certificates are installed
- [ ] Firewall is configured
- [ ] Database security rules are set
- [ ] API rate limiting is enabled
- [ ] Monitoring is configured
- [ ] Backups are set up
- [ ] Security headers are configured
- [ ] Regular updates are scheduled

## Performance Checklist

- [ ] CDN is configured
- [ ] Database indexes are optimized
- [ ] Caching is implemented
- [ ] Image optimization is enabled
- [ ] Bundle size is optimized
- [ ] API response times are monitored
- [ ] Error rates are tracked

Your AI-Hub production environment is now ready! 🚀 