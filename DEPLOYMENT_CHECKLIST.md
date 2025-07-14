# AI-Hub Production Deployment Checklist

This document consolidates all manual steps required for a complete production deployment of the AI-Hub application. These tasks are not fully automated by existing scripts and require direct action.

## ✅ Core Infrastructure Setup

### 1. Firebase Production Project Setup
- [ ] Create a new Firebase project named `ai-hub-prod` in the Firebase Console.
- [ ] Enable Email/Password authentication (and any other required providers like Google, Apple).
- [ ] Configure Firestore Database:
    - [ ] Create database in "production mode."
    - [ ] Set up security rules for `/users`, `/prototypes`, and `/mentors` as defined in `PRODUCTION_SETUP.md`.
- [ ] Configure Firebase Storage:
    - [ ] Get started in "production mode."
    - [ ] Set up security rules as defined in `PRODUCTION_SETUP.md`.
- [ ] Download `google-services.json` for Android and `GoogleService-Info.plist` for iOS from Project Settings.
- [ ] Create a Firebase Admin SDK service account key and download the JSON file. Extract relevant values for `.env.production`.

### 2. Stripe Production Configuration
- [ ] Log into your Stripe Dashboard and switch to "Live" mode.
- [ ] Note down your live Publishable Key (`pk_live_...`) and Secret Key (`sk_live_...`).
- [ ] Configure Products and Prices in the Stripe Dashboard (e.g., for mentor sessions, subscriptions).
- [ ] Set up a webhook endpoint: `https://api.ai-hub.com/webhooks/stripe`.
- [ ] Select necessary events (e.g., `payment_intent.succeeded`, `customer.subscription.*`).
- [ ] Copy the webhook secret (`whsec_...`).
- [ ] (Optional) Configure the Stripe Customer Portal.

### 3. Sentry Production Setup
- [ ] Create a new Sentry project (e.g., `ai-hub-prod`) for React Native.
- [ ] Obtain the Sentry DSN for your production project.
- [ ] Create a Sentry Auth Token with `project:write` scope for release tracking.
- [ ] Configure release tracking and source maps upload within your CI/CD pipeline (see section below).

## 🌐 Domain & SSL Setup

### 1. Domain Configuration
- [ ] Purchase a domain name (e.g., `ai-hub.com`).
- [ ] Configure DNS `A` records for `api.ai-hub.com` and `ws.ai-hub.com` to point to your server's IP address.
- [ ] Configure DNS `CNAME` record for `www.ai-hub.com` to `ai-hub.com` (or your preferred root domain).

### 2. SSL Certificates
- [ ] Install Certbot (or similar ACME client) on your server.
- [ ] Obtain and install SSL certificates for your domains (e.g., `api.ai-hub.com`, `ws.ai-hub.com`, `ai-hub.com`) using Certbot with Nginx integration.
- [ ] Set up automatic certificate renewal.

## 🖥️ Server Environment Setup

### 1. Choose Hosting Provider
- [ ] Select a suitable hosting provider (e.g., Google Cloud Platform, AWS, DigitalOcean, Heroku).

### 2. Server Provisioning
- [ ] Provision a server instance (VM or container) with minimum requirements (2 CPU cores, 4GB RAM, 50GB SSD).
- [ ] Install a compatible operating system (e.g., Ubuntu 20.04 LTS).

### 3. Install Server Dependencies
- [ ] Update system packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js v18 or higher.
- [ ] Install PM2 globally: `sudo npm install -g pm2` (for process management).
- [ ] Install Nginx: `sudo apt install nginx -y` (for reverse proxy and SSL termination).

### 4. Nginx Configuration
- [ ] Create and configure Nginx server blocks (e.g., `/etc/nginx/sites-available/ai-hub`) for:
    - [ ] Proxying requests to the backend API (`http://localhost:3000`).
    - [ ] Proxying WebSocket connections.
    - [ ] Applying SSL certificates obtained from Certbot.
- [ ] Enable the Nginx site and restart Nginx.

## 🔒 Security Checklist (Manual Verification & Configuration)

- [ ] Ensure all environment variables (especially sensitive keys and secrets) are securely stored and not committed to version control.
- [ ] Configure server firewall rules to allow only necessary incoming connections (e.g., HTTP/S, SSH).
- [ ] Review and harden Firebase security rules for Firestore and Storage to prevent unauthorized access.
- [ ] Implement API rate limiting on the backend to protect against abuse.
- [ ] Configure comprehensive monitoring and alerting for server health, application performance, and security events.
- [ ] Establish a robust backup strategy for your database and critical files.
- [ ] Configure security headers in Nginx (e.g., Content Security Policy, X-XSS-Protection, Strict-Transport-Security).
- [ ] Schedule regular system and dependency updates for all components.

## 📊 Performance Checklist (Manual Implementation & Optimization)

- [ ] Configure a Content Delivery Network (CDN) for static assets (e.g., images, frontend build files).
- [ ] Optimize database indexes in Firestore based on query patterns.
- [ ] Implement caching mechanisms (e.g., Redis for frequently accessed data) on the backend.
- [ ] Enable image optimization for all uploaded assets.

## 🚀 CI/CD Pipeline Implementation

- [ ] Set up GitHub Actions or GitLab CI/CD workflows as outlined in `deployment.config.js`:
    - [ ] Workflow for `Test` (lint, test, build).
    - [ ] Workflow for `Deploy to Staging` (build Android/iOS staging, deploy staging).
    - [ ] Workflow for `Deploy to Production` (triggered by releases, build Android/iOS production, deploy production).
- [ ] Ensure secure handling of CI/CD secrets (e.g., environment variables, API keys).

## 📱 Mobile App Store Deployment

### 1. Google Play Store (Android)
- [ ] Create a Google Play Developer account.
- [ ] Create a new app listing in the Google Play Console.
- [ ] Prepare screenshots, feature graphics, and a detailed store listing.
- [ ] Upload the production AAB file.
- [ ] Configure release tracks (internal, alpha, beta, production) and rollouts.
- [ ] Write detailed release notes for each language.

### 2. Apple App Store (iOS)
- [ ] Enroll in the Apple Developer Program.
- [ ] Create a new app in App Store Connect.
- [ ] Generate necessary provisioning profiles and certificates.
- [ ] Prepare screenshots and a detailed app store listing.
- [ ] Upload the production IPA file via Xcode or Transporter.
- [ ] Configure TestFlight for beta testing.
- [ ] Submit for App Store review.

---
**Note:** This checklist provides a high-level overview. Refer to `PRODUCTION_SETUP.md` for more granular details on each step. 