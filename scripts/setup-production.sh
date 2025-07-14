#!/bin/bash

# AI-Hub Production Setup Script
# This script helps set up the production environment

set -e

echo "🚀 AI-Hub Production Environment Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
print_status "Node.js $(node -v) is installed"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_status "npm $(npm -v) is installed"

# Check Expo CLI
if ! command -v expo &> /dev/null; then
    print_warning "Expo CLI is not installed. Installing..."
    npm install -g @expo/cli
fi
print_status "Expo CLI is installed"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_info "Creating .env.production from template..."
    if [ -f "env.production.template" ]; then
        cp env.production.template .env.production
        print_status ".env.production created from template"
    else
        print_error "env.production.template not found"
        exit 1
    fi
else
    print_warning ".env.production already exists. Backing up..."
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
fi

# Function to validate environment variable
validate_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env.production | cut -d'=' -f2-)
    
    if [ -z "$var_value" ] || [ "$var_value" = "your_$var_name" ]; then
        print_warning "$var_name is not configured"
        return 1
    else
        print_status "$var_name is configured"
        return 0
    fi
}

# Function to prompt for environment variable
prompt_for_env_var() {
    local var_name=$1
    local description=$2
    local current_value=$(grep "^$var_name=" .env.production | cut -d'=' -f2-)
    
    echo ""
    print_info "$description"
    if [ -n "$current_value" ] && [ "$current_value" != "your_$var_name" ]; then
        echo "Current value: $current_value"
        read -p "Keep current value? (y/n): " keep_current
        if [ "$keep_current" = "y" ] || [ "$keep_current" = "Y" ]; then
            return 0
        fi
    fi
    
    read -p "Enter $var_name: " new_value
    if [ -n "$new_value" ]; then
        # Escape special characters for sed
        escaped_value=$(echo "$new_value" | sed 's/[\/&]/\\&/g')
        sed -i "s/^$var_name=.*/$var_name=$escaped_value/" .env.production
        print_status "$var_name updated"
    fi
}

# Environment variable configuration
echo ""
echo "🔧 Environment Variable Configuration"
echo "===================================="

# Firebase Configuration
echo ""
print_info "Firebase Configuration"
echo "------------------------"

prompt_for_env_var "EXPO_PUBLIC_FIREBASE_API_KEY" "Firebase API Key (from Firebase Console > Project Settings > General > Your apps)"
prompt_for_env_var "EXPO_PUBLIC_FIREBASE_PROJECT_ID" "Firebase Project ID (should be 'ai-hub-prod')"
prompt_for_env_var "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" "Firebase Auth Domain (should be 'ai-hub-prod.firebaseapp.com')"
prompt_for_env_var "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" "Firebase Storage Bucket (should be 'ai-hub-prod.appspot.com')"

# Stripe Configuration
echo ""
print_info "Stripe Configuration"
echo "----------------------"

prompt_for_env_var "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Stripe Publishable Key (starts with 'pk_live_')"
prompt_for_env_var "STRIPE_SECRET_KEY" "Stripe Secret Key (starts with 'sk_live_')"
prompt_for_env_var "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Secret (starts with 'whsec_')"

# Sentry Configuration
echo ""
print_info "Sentry Configuration"
echo "----------------------"

prompt_for_env_var "EXPO_PUBLIC_SENTRY_DSN" "Sentry DSN (from Sentry project settings)"

# API Configuration
echo ""
print_info "API Configuration"
echo "-------------------"

prompt_for_env_var "EXPO_PUBLIC_API_URL" "API URL (e.g., 'https://api.ai-hub.com')"
prompt_for_env_var "EXPO_PUBLIC_WEBSOCKET_URL" "WebSocket URL (e.g., 'wss://ws.ai-hub.com')"

# Generate security keys
echo ""
print_info "Security Keys"
echo "---------------"

# Generate encryption key if not set
if ! validate_env_var "ENCRYPTION_KEY"; then
    print_info "Generating encryption key..."
    encryption_key=$(openssl rand -base64 32)
    sed -i "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$encryption_key/" .env.production
    print_status "Encryption key generated"
fi

# Generate JWT secret if not set
if ! validate_env_var "JWT_SECRET"; then
    print_info "Generating JWT secret..."
    jwt_secret=$(openssl rand -base64 64)
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env.production
    print_status "JWT secret generated"
fi

# Generate API key if not set
if ! validate_env_var "API_KEY"; then
    print_info "Generating API key..."
    api_key=$(openssl rand -base64 32)
    sed -i "s/^API_KEY=.*/API_KEY=$api_key/" .env.production
    print_status "API key generated"
fi

# Install dependencies
echo ""
print_info "Installing Dependencies"
echo "---------------------------"

if [ -f "package.json" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    print_status "Frontend dependencies installed"
fi

if [ -f "backend/package.json" ]; then
    print_info "Installing backend dependencies..."
    cd backend
    npm install --production
    cd ..
    print_status "Backend dependencies installed"
fi

# Validate configuration
echo ""
print_info "Validating Configuration"
echo "---------------------------"

validation_errors=0

# Check required environment variables
required_vars=(
    "EXPO_PUBLIC_FIREBASE_API_KEY"
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
    "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_SECRET_KEY"
    "EXPO_PUBLIC_SENTRY_DSN"
    "EXPO_PUBLIC_API_URL"
    "ENCRYPTION_KEY"
    "JWT_SECRET"
    "API_KEY"
)

for var in "${required_vars[@]}"; do
    if ! validate_env_var "$var"; then
        validation_errors=$((validation_errors + 1))
    fi
done

# Check Firebase configuration format
firebase_api_key=$(grep "^EXPO_PUBLIC_FIREBASE_API_KEY=" .env.production | cut -d'=' -f2-)
if [[ ! "$firebase_api_key" =~ ^AIza[0-9A-Za-z_-]{35}$ ]]; then
    print_warning "Firebase API key format appears incorrect"
    validation_errors=$((validation_errors + 1))
fi

# Check Stripe keys format
stripe_publishable_key=$(grep "^EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=" .env.production | cut -d'=' -f2-)
if [[ ! "$stripe_publishable_key" =~ ^pk_live_[0-9a-zA-Z]{24}$ ]]; then
    print_warning "Stripe publishable key format appears incorrect"
    validation_errors=$((validation_errors + 1))
fi

stripe_secret_key=$(grep "^STRIPE_SECRET_KEY=" .env.production | cut -d'=' -f2-)
if [[ ! "$stripe_secret_key" =~ ^sk_live_[0-9a-zA-Z]{24}$ ]]; then
    print_warning "Stripe secret key format appears incorrect"
    validation_errors=$((validation_errors + 1))
fi

# Check Sentry DSN format
sentry_dsn=$(grep "^EXPO_PUBLIC_SENTRY_DSN=" .env.production | cut -d'=' -f2-)
if [[ ! "$sentry_dsn" =~ ^https://[0-9a-f]{32}@[a-zA-Z0-9.-]+/[0-9]+$ ]]; then
    print_warning "Sentry DSN format appears incorrect"
    validation_errors=$((validation_errors + 1))
fi

# Final validation result
if [ $validation_errors -eq 0 ]; then
    echo ""
    print_status "Configuration validation passed!"
else
    echo ""
    print_error "Configuration validation failed with $validation_errors errors"
    print_info "Please review and fix the configuration issues above"
    exit 1
fi

# Create production build script
echo ""
print_info "Creating Production Build Script"
echo "------------------------------------"

cat > scripts/build-production.sh << 'EOF'
#!/bin/bash

# AI-Hub Production Build Script

set -e

echo "🏗️  Building AI-Hub for Production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production not found. Run setup-production.sh first."
    exit 1
fi

# Copy production environment
cp .env.production .env

# Build Android
print_info "Building Android APK..."
expo build:android --type apk --release-channel production

# Build iOS
print_info "Building iOS Archive..."
expo build:ios --type archive --release-channel production

print_status "Production builds completed!"
print_info "Check the Expo dashboard for build status and download links."
EOF

chmod +x scripts/build-production.sh
print_status "Production build script created"

# Create deployment script
cat > scripts/deploy-production.sh << 'EOF'
#!/bin/bash

# AI-Hub Production Deployment Script

set -e

echo "🚀 Deploying AI-Hub to Production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found"
    exit 1
fi

# Deploy backend
print_info "Deploying backend..."
cd backend

# Copy production environment
if [ -f "../.env.production" ]; then
    cp ../.env.production .env
fi

# Install dependencies
npm install --production

# Start with PM2 if available
if command -v pm2 &> /dev/null; then
    pm2 start src/server.ts --name "ai-hub-backend"
    pm2 save
    print_status "Backend deployed with PM2"
else
    print_warning "PM2 not found. Starting backend manually..."
    npm start &
fi

cd ..

print_status "Production deployment completed!"
print_info "Backend should be running on port 3000"
print_info "Check logs for any errors"
EOF

chmod +x scripts/deploy-production.sh
print_status "Production deployment script created"

# Final instructions
echo ""
echo "🎉 Production Environment Setup Complete!"
echo "=========================================="
echo ""
print_status "Next steps:"
echo ""
echo "1. 📱 Build the app:"
echo "   ./scripts/build-production.sh"
echo ""
echo "2. 🚀 Deploy backend:"
echo "   ./scripts/deploy-production.sh"
echo ""
echo "3. 🔍 Test the deployment:"
echo "   - Test API endpoints"
echo "   - Test authentication"
echo "   - Test payments"
echo "   - Test real-time features"
echo ""
echo "4. 📊 Monitor the application:"
echo "   - Check Sentry for errors"
echo "   - Monitor performance metrics"
echo "   - Review logs"
echo ""
echo "5. 🔒 Security checklist:"
echo "   - Verify SSL certificates"
echo "   - Check firewall rules"
echo "   - Review security headers"
echo "   - Test rate limiting"
echo ""
print_info "For detailed instructions, see PRODUCTION_SETUP.md"
echo ""
print_warning "Remember to keep your environment variables secure!"
echo "" 