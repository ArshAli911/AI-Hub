@echo off
setlocal enabledelayedexpansion

echo 🚀 AI-Hub Production Environment Setup
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js is installed

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed
    pause
    exit /b 1
)

echo ✅ npm is installed

REM Check if .env.production exists
if not exist ".env.production" (
    echo ℹ️  Creating .env.production from template...
    if exist "env.production.template" (
        copy "env.production.template" ".env.production" >nul
        echo ✅ .env.production created from template
    ) else (
        echo ❌ env.production.template not found
        pause
        exit /b 1
    )
) else (
    echo ⚠️  .env.production already exists. Backing up...
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
    set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
    set "datestamp=%YYYY%%MM%%DD%_%HH%%Min%"
    copy ".env.production" ".env.production.backup.%datestamp%" >nul
)

echo.
echo 🔧 Environment Variable Configuration
echo ====================================

echo.
echo Firebase Configuration
echo ------------------------

set /p firebase_api_key="Enter Firebase API Key: "
if not "!firebase_api_key!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^EXPO_PUBLIC_FIREBASE_API_KEY=.*', 'EXPO_PUBLIC_FIREBASE_API_KEY=!firebase_api_key!' | Set-Content .env.production"
    echo ✅ Firebase API Key updated
)

set /p firebase_project_id="Enter Firebase Project ID (should be 'ai-hub-prod'): "
if not "!firebase_project_id!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^EXPO_PUBLIC_FIREBASE_PROJECT_ID=.*', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=!firebase_project_id!' | Set-Content .env.production"
    echo ✅ Firebase Project ID updated
)

echo.
echo Stripe Configuration
echo -----------------------

set /p stripe_publishable_key="Enter Stripe Publishable Key (starts with 'pk_live_'): "
if not "!stripe_publishable_key!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=.*', 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=!stripe_publishable_key!' | Set-Content .env.production"
    echo ✅ Stripe Publishable Key updated
)

set /p stripe_secret_key="Enter Stripe Secret Key (starts with 'sk_live_'): "
if not "!stripe_secret_key!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^STRIPE_SECRET_KEY=.*', 'STRIPE_SECRET_KEY=!stripe_secret_key!' | Set-Content .env.production"
    echo ✅ Stripe Secret Key updated
)

echo.
echo Sentry Configuration
echo -----------------------

set /p sentry_dsn="Enter Sentry DSN: "
if not "!sentry_dsn!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^EXPO_PUBLIC_SENTRY_DSN=.*', 'EXPO_PUBLIC_SENTRY_DSN=!sentry_dsn!' | Set-Content .env.production"
    echo ✅ Sentry DSN updated
)

echo.
echo API Configuration
echo --------------------

set /p api_url="Enter API URL (e.g., 'https://api.ai-hub.com'): "
if not "!api_url!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^EXPO_PUBLIC_API_URL=.*', 'EXPO_PUBLIC_API_URL=!api_url!' | Set-Content .env.production"
    echo ✅ API URL updated
)

set /p websocket_url="Enter WebSocket URL (e.g., 'wss://ws.ai-hub.com'): "
if not "!websocket_url!"=="" (
    powershell -Command "(Get-Content .env.production) -replace '^EXPO_PUBLIC_WEBSOCKET_URL=.*', 'EXPO_PUBLIC_WEBSOCKET_URL=!websocket_url!' | Set-Content .env.production"
    echo ✅ WebSocket URL updated
)

echo.
echo Security Keys
echo ---------------

echo ℹ️  Generating security keys...

REM Generate encryption key
for /f "tokens=*" %%i in ('powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do set encryption_key=%%i
powershell -Command "(Get-Content .env.production) -replace '^ENCRYPTION_KEY=.*', 'ENCRYPTION_KEY=!encryption_key!' | Set-Content .env.production"
echo ✅ Encryption key generated

REM Generate JWT secret
for /f "tokens=*" %%i in ('powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))"') do set jwt_secret=%%i
powershell -Command "(Get-Content .env.production) -replace '^JWT_SECRET=.*', 'JWT_SECRET=!jwt_secret!' | Set-Content .env.production"
echo ✅ JWT secret generated

REM Generate API key
for /f "tokens=*" %%i in ('powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do set api_key=%%i
powershell -Command "(Get-Content .env.production) -replace '^API_KEY=.*', 'API_KEY=!api_key!' | Set-Content .env.production"
echo ✅ API key generated

echo.
echo Installing Dependencies
echo ---------------------------

if exist "package.json" (
    echo ℹ️  Installing frontend dependencies...
    npm install
    echo ✅ Frontend dependencies installed
)

if exist "backend\package.json" (
    echo ℹ️  Installing backend dependencies...
    cd backend
    npm install --production
    cd ..
    echo ✅ Backend dependencies installed
)

echo.
echo 🎉 Production Environment Setup Complete!
echo ==========================================
echo.
echo ✅ Next steps:
echo.
echo 1. 📱 Build the app:
echo    npm run build:android
echo    npm run build:ios
echo.
echo 2. 🚀 Deploy backend:
echo    cd backend
echo    npm start
echo.
echo 3. 🔍 Test the deployment:
echo    - Test API endpoints
echo    - Test authentication
echo    - Test payments
echo    - Test real-time features
echo.
echo 4. 📊 Monitor the application:
echo    - Check Sentry for errors
echo    - Monitor performance metrics
echo    - Review logs
echo.
echo 5. 🔒 Security checklist:
echo    - Verify SSL certificates
echo    - Check firewall rules
echo    - Review security headers
echo    - Test rate limiting
echo.
echo ℹ️  For detailed instructions, see PRODUCTION_SETUP.md
echo.
echo ⚠️  Remember to keep your environment variables secure!
echo.
pause 