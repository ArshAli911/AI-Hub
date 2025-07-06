# Testing Guide for AI Hub Application

This guide covers testing strategies for both the backend (Node.js/Express) and frontend (React Native/Expo) components of the AI Hub application.

## Table of Contents
1. [Backend Testing](#backend-testing)
2. [Frontend Testing](#frontend-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Testing Best Practices](#testing-best-practices)
6. [Running Tests](#running-tests)

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

### Unit Tests

Unit tests focus on testing individual functions and methods in isolation.

#### Service Layer Tests
Test business logic in services:
- User management operations
- Authentication logic
- Data validation
- Business rules

#### Controller Tests
Test HTTP request/response handling:
- Request validation
- Response formatting
- Error handling
- Status codes

#### Middleware Tests
Test custom middleware:
- Authentication middleware
- Validation middleware
- Rate limiting
- Error handling

### Integration Tests

Integration tests verify that different components work together correctly.

#### API Endpoint Tests
Test complete API endpoints:
- Full request/response cycles
- Database interactions
- Authentication flows
- Error scenarios

#### Database Integration Tests
Test database operations:
- CRUD operations
- Transactions
- Data relationships
- Query performance

### Test Examples

#### Service Test Example
```typescript
// src/services/__tests__/userService.test.ts
import { userService } from '../userService';
import { mockFirebaseAdmin } from '../../__mocks__/firebase-admin';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user'
      };

      mockFirebaseAdmin.auth().createUser.mockResolvedValue({
        uid: 'test-uid',
        email: userData.email
      });

      const result = await userService.createUser(userData);

      expect(result).toHaveProperty('uid', 'test-uid');
      expect(mockFirebaseAdmin.auth().createUser).toHaveBeenCalledWith(userData);
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        displayName: 'Test User'
      };

      await expect(userService.createUser(userData))
        .rejects.toThrow('Invalid email format');
    });
  });
});
```

#### Controller Test Example
```typescript
// src/controllers/__tests__/userController.test.ts
import request from 'supertest';
import { app } from '../../app';
import { mockAuthMiddleware } from '../../__mocks__/authMiddleware';

describe('UserController', () => {
  beforeEach(() => {
    mockAuthMiddleware.mockClear();
  });

  describe('POST /api/users', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('uid');
      expect(response.body.email).toBe(userData.email);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        displayName: ''
      };

      const response = await request(app)
        .post('/api/users')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
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
├── hooks/                # Custom hooks
└── services/             # API services
```

### Component Testing

Test React Native components using React Native Testing Library.

#### Component Test Example
```typescript
// src/components/__tests__/Button.test.tsx
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

  it('applies disabled state correctly', () => {
    const { getByText } = render(
      <Button title="Press Me" onPress={() => {}} disabled />
    );

    const button = getByText('Press Me');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
```

### Screen Testing

Test complete screen components and their interactions.

#### Screen Test Example
```typescript
// src/screens/__tests__/LoginScreen.test.tsx
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
    const mockLogin = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

## Integration Testing

### API Integration Tests

Test the complete flow from frontend to backend.

```typescript
// src/__tests__/integration/auth.test.ts
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

For E2E testing, use Detox with React Native.

```typescript
// e2e/auth.test.js
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
});
```

## Testing Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking
- Mock external dependencies (APIs, databases)
- Use dependency injection for better testability
- Create reusable mock factories

### 3. Test Data
- Use factories for creating test data
- Keep test data minimal and focused
- Clean up test data after tests

### 4. Coverage
- Aim for 80%+ code coverage
- Focus on critical business logic
- Test edge cases and error scenarios

### 5. Performance
- Keep tests fast and isolated
- Use test databases for integration tests
- Mock heavy operations

## Running Tests

### Backend Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci

# Run specific test file
npm test -- userService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="createUser"
```

### Frontend Tests

```bash
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
# Run Detox tests
npx detox test --configuration ios.sim.debug
npx detox test --configuration android.emu.debug
```

## Test Configuration

### Jest Configuration (Backend)
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Jest Configuration (Frontend)
```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/App.tsx'
  ]
};
```

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

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage --watchAll=false
```

This testing guide provides a comprehensive approach to testing your AI Hub application. Start with unit tests for critical business logic, add integration tests for API endpoints, and consider E2E tests for critical user flows. 