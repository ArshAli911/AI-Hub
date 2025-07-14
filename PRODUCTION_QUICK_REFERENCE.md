# AI-Hub Production Quick Reference

## 🚀 Quick Setup Commands

### 1. Run Production Setup Script
```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

### 2. Build for Production
```bash
./scripts/build-production.sh
```

### 3. Deploy Backend
```bash
./scripts/deploy-production.sh
```

## 🔑 Essential Environment Variables

### Firebase (Required)
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ai-hub-prod
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=ai-hub-prod.firebaseapp.com
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=ai-hub-prod.appspot.com
```

### Stripe (Required)
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Sentry (Required)
```env
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/project_id
```

### API (Required)
```env
EXPO_PUBLIC_API_URL=https://api.ai-hub.com
EXPO_PUBLIC_WEBSOCKET_URL=wss://ws.ai-hub.com
```

## 🔧 Service Setup Checklist

### ✅ Firebase Setup
- [ ] Create project: `ai-hub-prod`
- [ ] Enable Authentication
- [ ] Enable Firestore Database
- [ ] Enable Storage
- [ ] Download `google-services.json` (Android)
- [ ] Download `GoogleService-Info.plist` (iOS)
- [ ] Create service account key

### ✅ Stripe Setup
- [ ] Switch to Live mode
- [ ] Get publishable key (`pk_live_...`)
- [ ] Get secret key (`sk_live_...`)
- [ ] Create webhook endpoint
- [ ] Get webhook secret (`whsec_...`)

### ✅ Sentry Setup
- [ ] Create project: `ai-hub-prod`
- [ ] Get DSN
- [ ] Create auth token
- [ ] Configure release tracking

## 🌐 Domain & SSL Setup

### DNS Records
```
A     api.ai-hub.com     -> Your server IP
A     ws.ai-hub.com      -> Your server IP
CNAME  www.ai-hub.com    -> ai-hub.com
```

### SSL Certificates
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d api.ai-hub.com -d ws.ai-hub.com
```

## 🖥️ Server Setup

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 20.04 LTS

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/ai-hub
server {
    listen 443 ssl;
    server_name api.ai-hub.com;
    
    ssl_certificate /etc/letsencrypt/live/api.ai-hub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ai-hub.com/privkey.pem;
    
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
```

## 🔍 Monitoring & Debugging

### Check Backend Status
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs ai-hub-backend

# Restart backend
pm2 restart ai-hub-backend
```

### Check Nginx Status
```bash
# Check status
sudo systemctl status nginx

# Check configuration
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

### Check SSL Certificates
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew
```

## 🚨 Emergency Commands

### Restart Everything
```bash
# Restart backend
pm2 restart all

# Restart nginx
sudo systemctl restart nginx

# Restart server (if needed)
sudo reboot
```

### Rollback Deployment
```bash
# Stop current deployment
pm2 stop ai-hub-backend

# Start previous version
pm2 start ai-hub-backend -- --version=previous

# Or restore from backup
cp .env.production.backup.* .env.production
```

### Check System Resources
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
htop

# Check network
netstat -tulpn
```

## 📞 Support Contacts

### Firebase Support
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)

### Stripe Support
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe Documentation](https://stripe.com/docs)

### Sentry Support
- [Sentry Dashboard](https://sentry.io/)
- [Sentry Documentation](https://docs.sentry.io/)

### Expo Support
- [Expo Dashboard](https://expo.dev/)
- [Expo Documentation](https://docs.expo.dev/)

## 🔐 Security Checklist

- [ ] Environment variables are secure
- [ ] SSL certificates are installed
- [ ] Firewall is configured
- [ ] Database security rules are set
- [ ] API rate limiting is enabled
- [ ] Monitoring is configured
- [ ] Backups are set up
- [ ] Security headers are configured
- [ ] Regular updates are scheduled

## 📊 Performance Checklist

- [ ] CDN is configured
- [ ] Database indexes are optimized
- [ ] Caching is implemented
- [ ] Image optimization is enabled
- [ ] Bundle size is optimized
- [ ] API response times are monitored
- [ ] Error rates are tracked

## 🚀 Launch Checklist

- [ ] All services are configured
- [ ] Environment variables are set
- [ ] SSL certificates are valid
- [ ] Backend is deployed and running
- [ ] App is built and uploaded to stores
- [ ] Monitoring is active
- [ ] Backups are configured
- [ ] Security measures are in place
- [ ] Performance is optimized
- [ ] Documentation is complete

---

**Remember**: Always test in staging environment before deploying to production! 