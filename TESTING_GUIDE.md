# AI Hub Application Testing Guide

This guide provides comprehensive testing strategies for the AI Hub application, covering both backend (Node.js/Express) and frontend (React Native/Expo) components.

## Table of Contents

1. [Overview](#overview)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Running Tests](#running-tests)
7. [Test Best Practices](#test-best-practices)
8. [Continuous Integration](#continuous-integration)

## Overview

The AI Hub application consists of:
- **Backend**: Node.js/Express API with Firebase Admin SDK
- **Frontend**: React Native app with Expo
- **Real-time Features**: WebSocket connections with Socket.IO
- **Authentication**: Firebase Authentication
- **Database**: Firestore
- **Advanced Features**: RBAC, audit logging, bulk operations, scheduled jobs

## Backend Testing

### Test Structure
```
backend/
├── src/
│   ├── __tests__/           # Test files
│   │   ├── unit/            # Unit tests
│   │   ├── integration/     # Integration tests
│   │   └── e2e/            # End-to-end tests
│   ├── services/           # Service layer
│   ├── controllers/        # Controller layer
│   ├── middleware/         # Middleware
│   └── routes/            # Route definitions
├── jest.config.js         # Jest configuration
└── package.json           # Test scripts
```

### Available Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Unit Testing

#### Service Layer Tests
Test business logic in isolation:

```typescript
// Example: userService.test.ts
import { createUserService, getUserByIdService } from '../userService';

describe('UserService', () => {
  describe('createUserService', () => {
    it('should throw if email is missing', async () => {
      await expect(createUserService('', 'password123')).rejects.toThrow();
    });

    it('should throw if password is missing', async () => {
      await expect(createUserService('test@example.com', '')).rejects.toThrow();
    });
  });
});
```

#### Controller Tests
Test HTTP request/response handling:

```typescript
// Example: userController.test.ts
import request from 'supertest';
import { app } from '../../app';

describe('UserController', () => {
  describe('POST /api/users', () => {
    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
```

#### Middleware Tests
Test custom middleware functions:

```typescript
// Example: authMiddleware.test.ts
import { authenticateToken } from '../authMiddleware';

describe('AuthMiddleware', () => {
  it('should reject requests without token', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

### Integration Testing

Test complete API endpoints and database interactions:

```typescript
// Example: userIntegration.test.ts
import request from 'supertest';
import { app } from '../../app';

describe('User API Integration', () => {
  it('should create user and return profile', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User'
    };

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('uid');
    expect(response.body.email).toBe(userData.email);
  });
});
```

### Testing Real-time Features

Test WebSocket connections and real-time functionality:

```typescript
// Example: websocket.test.ts
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';

describe('WebSocket Integration', () => {
  let server: any;
  let io: any;
  let clientSocket: any;

  beforeAll((done) => {
    server = createServer();
    io = new Server(server);
    server.listen(() => {
      const port = server.address().port;
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    server.close();
  });

  it('should handle chat messages', (done) => {
    clientSocket.emit('send_message', {
      roomId: 'test-room',
      message: 'Hello World'
    });

    clientSocket.on('message_received', (data) => {
      expect(data.message).toBe('Hello World');
      done();
    });
  });
});
```

## Frontend Testing

### Test Structure
```
src/
├── __tests__/              # Test files
│   ├── components/         # Component tests
│   ├── screens/           # Screen tests
│   ├── hooks/             # Custom hook tests
│   ├── services/          # Service tests
│   └── utils/             # Utility function tests
├── components/            # React components
├── screens/              # Screen components
└── services/             # API services
```

### Component Testing

Test React Native components using React Native Testing Library:

```typescript
// Example: Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Press Me" onPress={() => {}} />
    );

    expect(getByText('Press Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Press Me" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Press Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

### Screen Testing

Test complete screen components and navigation:

```typescript
// Example: LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../Auth/Login';
import { AuthProvider } from '../../context/AuthContext';

describe('LoginScreen', () => {
  it('renders login form', () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
  });

  it('handles form submission', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      // Verify navigation or state changes
    });
  });
});
```

### Custom Hook Testing

Test custom hooks in isolation:

```typescript
// Example: useAuth.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuth } from '../hooks/useAuth';

describe('useAuth Hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle login', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

## Integration Testing

### API Integration Tests

Test the complete flow from frontend to backend:

```typescript
// Example: auth.integration.test.ts
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../../screens/Auth/Login';
import { server } from '../../__mocks__/server';

describe('Authentication Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should login user and navigate to home', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Welcome to AI Hub')).toBeTruthy();
    });
  });
});
```

## End-to-End Testing

### Detox Testing

For E2E testing, use Detox with React Native:

```typescript
// Example: auth.e2e.test.js
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Welcome to AI Hub'))).toBeVisible();
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });
});
```

## Running Tests

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- userService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="createUser"
```

### Frontend Tests

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- LoginScreen.test.tsx
```

### E2E Tests

```bash
# Install Detox
npm install -g detox-cli

# Build for testing
detox build --configuration ios.sim.debug
detox build --configuration android.emu.debug

# Run E2E tests
detox test --configuration ios.sim.debug
detox test --configuration android.emu.debug
```

## Test Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking Strategy
- Mock external dependencies (APIs, databases, Firebase)
- Use dependency injection for better testability
- Create reusable mock factories

### 3. Test Data Management
- Use factories for creating test data
- Keep test data minimal and focused
- Clean up test data after tests

### 4. Coverage Goals
- Aim for 80%+ code coverage
- Focus on critical business logic
- Test edge cases and error scenarios

### 5. Performance Considerations
- Keep tests fast and isolated
- Use test databases for integration tests
- Mock heavy operations

### 6. Test Isolation
- Each test should be independent
- Avoid shared state between tests
- Use `beforeEach` and `afterEach` for setup/cleanup

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm run test:ci
      - run: cd backend && npm run build

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage --watchAll=false
      - run: npm run build

  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: detox build --configuration ios.sim.debug
      - run: detox test --configuration ios.sim.debug
```

### Test Environment Setup

Create environment-specific configurations:

```bash
# .env.test
NODE_ENV=test
PORT=3001
FIREBASE_PROJECT_ID=test-project
SENTRY_DSN=https://test@sentry.io/test
ALLOWED_ORIGINS=http://localhost:3000
```

## Testing Checklist

### Backend Testing
- [ ] Unit tests for all services
- [ ] Controller tests for all endpoints
- [ ] Middleware tests
- [ ] Integration tests for API flows
- [ ] Database operation tests
- [ ] Authentication flow tests
- [ ] Real-time feature tests
- [ ] Error handling tests
- [ ] Rate limiting tests
- [ ] RBAC permission tests

### Frontend Testing
- [ ] Component unit tests
- [ ] Screen integration tests
- [ ] Custom hook tests
- [ ] Navigation tests
- [ ] API service tests
- [ ] State management tests
- [ ] Form validation tests
- [ ] Error boundary tests
- [ ] Accessibility tests

### E2E Testing
- [ ] User registration flow
- [ ] User login/logout flow
- [ ] Profile management
- [ ] Marketplace interactions
- [ ] Mentor booking flow
- [ ] Real-time chat
- [ ] Notification system
- [ ] Admin dashboard access

This testing guide provides a comprehensive approach to ensuring the quality and reliability of your AI Hub application. Start with unit tests for critical business logic, add integration tests for API endpoints, and implement E2E tests for critical user flows. 