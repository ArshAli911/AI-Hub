# Project Structure & Organization

## Root Directory Layout

```
AI-Companion-App/
├── src/                    # Main application source code
├── backend/                # Node.js/Express backend server
├── android/                # Native Android project files
├── ios/                    # Native iOS project files (empty - using Expo)
├── assets/                 # Static assets (icons, images, fonts)
├── e2e/                    # End-to-end tests with Detox
├── scripts/                # Build and deployment scripts
└── [config files]          # Various configuration files
```

## Source Code Structure (`src/`)

### Core Application Files
```
src/
├── App.tsx                 # Main app entry point with providers
├── api/                    # API service layer
├── components/             # Reusable UI components
├── config/                 # App configuration and constants
├── constants/              # Global constants (colors, themes, sizes)
├── context/                # React Context providers
├── hooks/                  # Custom React hooks
├── navigation/             # React Navigation setup
├── screens/                # Screen-level components
├── services/               # External service integrations
├── state/                  # Global state management (Zustand)
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions and helpers
└── __tests__/              # Test files organized by category
```

## Component Organization

### Component Categories
- **Base Components**: Button, TextInput, LoadingSpinner
- **Layout Components**: ErrorBoundary, Modal, Form
- **Feature Components**: SearchInput, OfflineIndicator, OptimizedImage
- **Screen Components**: LazyScreen, UXDemoScreen

### Component File Structure
```
components/
├── index.ts                # Component exports
├── Button.tsx              # Base button with variants
├── ErrorBoundary.tsx       # Multi-level error handling
├── Form.tsx                # Advanced form system
├── Modal.tsx               # Modal system with variants
├── OfflineIndicator.tsx    # Network status indicators
├── OptimizedImage.tsx      # Performance-optimized images
├── OptimizedList.tsx       # Virtualized list component
├── SearchInput.tsx         # Enhanced search with suggestions
└── LazyScreen.tsx          # Lazy-loaded screen wrapper
```

## Service Layer Organization

### Services Structure
```
services/
├── firebaseService.ts      # Firebase integration
├── secureStorage.ts        # Secure data storage
└── offlineService.ts       # Offline functionality
```

### API Layer
```
api/
├── client.ts               # HTTP client configuration
└── auth.api.ts             # Authentication API calls
```

## Utility Organization

### Utils Categories
```
utils/
├── accessibility.ts        # Accessibility helpers and service
├── asyncHandler.ts         # Async operation utilities
├── dateUtils.ts           # Date formatting and manipulation
├── logger.ts              # Comprehensive logging system
├── performanceMonitor.ts  # Performance tracking
├── security.ts            # Security utilities
└── validation.ts          # Form validation helpers
```

## Hook Organization

### Custom Hooks
```
hooks/
├── index.ts               # Hook exports
├── useAccessibility.ts    # Accessibility features
├── useLazyLoading.ts      # Lazy loading functionality
├── useMemoryManagement.ts # Memory optimization
├── useOffline.ts          # Offline functionality
└── useSecurity.ts         # Security-related hooks
```

## Testing Structure

### Test Organization
```
__tests__/
├── setup.ts               # Test configuration
├── components/            # Component unit tests
├── hooks/                 # Hook unit tests
├── utils/                 # Utility unit tests
├── services/              # Service unit tests
├── integration/           # Integration tests
├── performance/           # Performance tests
└── security/              # Security tests
```

## Backend Structure

### Backend Organization
```
backend/
├── src/
│   ├── server.ts          # Express server entry point
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic services
│   ├── models/            # Data models
│   └── utils/             # Backend utilities
├── dist/                  # Compiled JavaScript output
└── coverage/              # Test coverage reports
```

## Configuration Files

### Key Configuration Files
- `package.json` - Dependencies and scripts
- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript configuration with path mapping
- `jest.config.js` - Comprehensive test configuration
- `babel.config.js` - Babel transformation rules
- `metro.config.js` - Metro bundler configuration
- `.detoxrc.js` - E2E testing configuration
- `eas.json` - EAS Build configuration

## Naming Conventions

### File Naming
- **Components**: PascalCase (e.g., `Button.tsx`, `ErrorBoundary.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useOffline.ts`)
- **Utils**: camelCase (e.g., `dateUtils.ts`, `performanceMonitor.ts`)
- **Services**: camelCase with `Service` suffix (e.g., `firebaseService.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`, `ApiTypes.ts`)

### Directory Naming
- **Lowercase with hyphens** for multi-word directories (e.g., `__tests__`)
- **camelCase** for single-word directories (e.g., `components`, `services`)

## Import/Export Patterns

### Barrel Exports
- Each major directory has an `index.ts` file for clean imports
- Components, hooks, and utilities are exported through barrel files

### Import Aliases
- `@/` - Points to `src/` directory
- `@components/` - Points to `src/components/`
- `@services/` - Points to `src/services/`
- `@utils/` - Points to `src/utils/`
- `@hooks/` - Points to `src/hooks/`
- `@types/` - Points to `src/types/`

## Code Organization Principles

### Component Structure
1. **Imports** (external libraries first, then internal)
2. **Types and interfaces**
3. **Component implementation**
4. **Styles** (StyleSheet at bottom)
5. **Default export**

### Service Structure
1. **Configuration and constants**
2. **Type definitions**
3. **Main service class or functions**
4. **Helper functions**
5. **Export statement**

### File Size Guidelines
- **Components**: Keep under 200 lines, split into smaller components if needed
- **Services**: Keep focused on single responsibility
- **Utils**: Group related utilities together, but keep functions focused
- **Hooks**: One hook per file, with clear single responsibility