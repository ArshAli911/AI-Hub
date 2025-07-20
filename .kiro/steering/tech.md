# Technology Stack

## Frontend (Mobile App)

### Core Framework
- **React Native** 0.74.5 with **Expo** ~51.0.8
- **TypeScript** ~5.3.3 with strict mode enabled
- **React** 18.2.0 with Suspense and concurrent features

### Navigation & State
- **React Navigation** v7 (Stack + Bottom Tabs)
- **Zustand** v5 for state management
- **React Context** for authentication and global state

### UI & Styling
- **React Native** built-in components
- **Expo** modules for device features (notifications, image picker, etc.)
- Custom component library with accessibility support

### Development Tools
- **Expo Dev Client** for development builds
- **TypeScript** with path mapping (`@/`, `@components/`, etc.)
- **ESLint** with React Native and TypeScript rules
- **Detox** for E2E testing

## Backend

### Core Framework
- **Node.js** with **Express** 4.19.2
- **TypeScript** with **ts-node** for development
- **Firebase Admin SDK** for authentication and database

### Security & Middleware
- **Helmet** for security headers
- **CORS** for cross-origin requests
- **Express Rate Limit** for API protection
- **Joi** for request validation

### Monitoring & Logging
- **Winston** with daily rotate file logging
- **Sentry** for error tracking
- **Swagger** for API documentation

### Real-time & Scheduling
- **Socket.io** for WebSocket connections
- **Node-cron** for scheduled tasks

## Testing Framework

### Unit & Integration Testing
- **Jest** with **jest-expo** preset
- **React Native Testing Library** for component testing
- **Supertest** for API testing
- **Coverage threshold**: 80% minimum

### E2E Testing
- **Detox** for mobile E2E testing
- **Jest** configuration for E2E test runner

### Test Organization
- **Unit tests**: Component, hook, utility testing
- **Integration tests**: Feature workflow testing
- **Performance tests**: Rendering and memory testing
- **Security tests**: Authentication and validation testing

## Build & Deployment

### Mobile Builds
- **EAS Build** for production builds
- **EAS Submit** for app store deployment
- **Expo Prebuild** for native code generation

### Development Workflow
- **Expo CLI** for development server
- **Metro** bundler with custom configuration
- **Babel** for JavaScript transformation

## Common Commands

### Development
```bash
# Start development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web

# Development tools
npm run clean          # Clear Expo cache
npm run doctor         # Check Expo setup
```

### Building
```bash
# Production builds
npm run build:android-aab    # Android App Bundle
npm run build:android-apk    # Android APK
npm run build:ios           # iOS build
npm run build:web           # Web export

# Preview builds
npm run build:android-apk    # Preview APK
npm run build:ios-simulator  # iOS simulator build
```

### Testing
```bash
# Unit and integration tests
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report

# Specific test suites
npm run test:security      # Security tests only
npm run test:performance   # Performance tests only
npm run test:integration   # Integration tests only

# E2E testing
npm run test:e2e:build     # Build E2E test app
npm run test:e2e           # Run E2E tests
```

### Code Quality
```bash
# Linting and type checking
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix ESLint issues
npm run type-check        # TypeScript check
```

### Backend Development
```bash
# Backend commands (run from /backend directory)
npm run dev               # Development server with nodemon
npm run build             # Compile TypeScript
npm run start             # Production server
npm test                  # Backend tests
```

## Environment Configuration

### Required Environment Variables
- `EXPO_PUBLIC_API_BASE_URL` - Backend API URL
- Firebase configuration (handled via google-services.json)
- EAS project configuration in app.json

### Development Setup
1. Install dependencies: `npm install`
2. Set up environment variables in `.env`
3. Configure Firebase credentials
4. Run `npm start` to begin development