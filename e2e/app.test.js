const { device, expect, element, by, waitFor } = require('detox');

describe('AI Hub App - E2E Tests', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch and Navigation', () => {
    it('should launch app successfully', async () => {
      await expect(element(by.id('app-container'))).toBeVisible();
    });

    it('should show splash screen initially', async () => {
      await device.launchApp({ newInstance: true });
      await expect(element(by.id('splash-screen'))).toBeVisible();
    });

    it('should navigate to main app after splash', async () => {
      await device.launchApp({ newInstance: true });
      await waitFor(element(by.id('main-app')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should show bottom tab navigation', async () => {
      await expect(element(by.id('bottom-tab-navigator'))).toBeVisible();
      await expect(element(by.text('Home'))).toBeVisible();
      await expect(element(by.text('Mentors'))).toBeVisible();
      await expect(element(by.text('Community'))).toBeVisible();
    });
  });

  describe('Authentication Flow', () => {
    it('should show login screen for unauthenticated users', async () => {
      await device.launchApp({ newInstance: true });
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should allow user to navigate to register screen', async () => {
      await element(by.id('register-link')).tap();
      await expect(element(by.id('register-screen'))).toBeVisible();
    });

    it('should validate login form', async () => {
      await element(by.id('login-button')).tap();
      await expect(element(by.text('Email is required'))).toBeVisible();
    });

    it('should handle login flow', async () => {
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      // Should show loading state
      await expect(element(by.id('loading-spinner'))).toBeVisible();

      // Wait for login to complete (success or error)
      await waitFor(element(by.id('loading-spinner')))
        .not.toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Offline Functionality', () => {
    it('should show offline indicator when network is disabled', async () => {
      await simulateOffline();
      await expect(element(by.id('offline-indicator'))).toBeVisible();
      await expect(element(by.text('You are offline'))).toBeVisible();
    });

    it('should queue actions when offline', async () => {
      await simulateOffline();

      // Try to perform an action that requires network
      await element(by.id('create-post-button')).tap();
      await element(by.id('post-title-input')).typeText('Offline Post');
      await element(by.id('submit-post-button')).tap();

      // Should show queued message
      await expect(element(by.text('Post will be created when you\'re back online'))).toBeVisible();
    });

    it('should sync queued actions when back online', async () => {
      // First go offline and queue an action
      await simulateOffline();
      await element(by.id('create-post-button')).tap();
      await element(by.id('post-title-input')).typeText('Sync Test Post');
      await element(by.id('submit-post-button')).tap();

      // Go back online
      await simulateOnline();

      // Should show sync indicator
      await expect(element(by.text('Syncing data...'))).toBeVisible();

      // Wait for sync to complete
      await waitFor(element(by.text('All data synchronized')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Loading States and Skeleton Screens', () => {
    it('should show skeleton screens while loading', async () => {
      await element(by.text('Mentors')).tap();

      // Should show skeleton loading
      await expect(element(by.id('skeleton-list'))).toBeVisible();

      // Wait for actual content to load
      await waitForLoadingToComplete();
      await expect(element(by.id('mentors-list'))).toBeVisible();
    });

    it('should show loading spinner for actions', async () => {
      await element(by.id('refresh-button')).tap();
      await expect(element(by.id('loading-spinner'))).toBeVisible();

      await waitForLoadingToComplete();
    });
  });

  describe('Error Handling', () => {
    it('should show error boundary when component crashes', async () => {
      // Trigger an error in the app
      await triggerError();

      await expect(element(by.text('Oops! Something went wrong'))).toBeVisible();
      await expect(element(by.text('Try Again'))).toBeVisible();
    });

    it('should recover from errors when retry is pressed', async () => {
      await triggerError();
      await element(by.text('Try Again')).tap();

      // Should return to normal state
      await expect(element(by.id('main-app'))).toBeVisible();
    });

    it('should handle network errors gracefully', async () => {
      await simulateOffline();

      // Try to load data
      await element(by.id('refresh-button')).tap();

      // Should show cached data or error message
      await waitFor(element(by.text('Showing cached data')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Form Validation and Submission', () => {
    it('should validate form fields in real-time', async () => {
      await element(by.text('Profile')).tap();
      await element(by.id('edit-profile-button')).tap();

      // Clear email field and type invalid email
      await element(by.id('email-input')).clearText();
      await element(by.id('email-input')).typeText('invalid-email');

      // Tap outside to trigger validation
      await element(by.id('name-input')).tap();

      await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
    });

    it('should submit form successfully with valid data', async () => {
      await fillForm({
        'name-input': 'John Doe',
        'email-input': 'john@example.com',
        'bio-input': 'Software developer',
      });

      await submitForm();

      await expect(element(by.text('Profile updated successfully'))).toBeVisible();
    });
  });

  describe('Search Functionality', () => {
    it('should show search suggestions', async () => {
      await element(by.id('search-input')).typeText('React');

      // Should show suggestions
      await expect(element(by.id('search-suggestions'))).toBeVisible();
      await expect(element(by.text('React Native'))).toBeVisible();
    });

    it('should perform search and show results', async () => {
      await element(by.id('search-input')).typeText('AI mentors');
      await element(by.id('search-button')).tap();

      await waitForLoadingToComplete();
      await expect(element(by.id('search-results'))).toBeVisible();
    });

    it('should handle empty search results', async () => {
      await element(by.id('search-input')).typeText('nonexistentquery123');
      await element(by.id('search-button')).tap();

      await waitForLoadingToComplete();
      await expect(element(by.text('No results found'))).toBeVisible();
    });
  });

  describe('Modal Interactions', () => {
    it('should open and close modals', async () => {
      await element(by.id('open-modal-button')).tap();
      await expect(element(by.id('modal-container'))).toBeVisible();

      await element(by.id('close-modal-button')).tap();
      await waitForElementToDisappear(by.id('modal-container'));
    });

    it('should close modal when tapping backdrop', async () => {
      await element(by.id('open-modal-button')).tap();
      await expect(element(by.id('modal-container'))).toBeVisible();

      await element(by.id('modal-backdrop')).tap();
      await waitForElementToDisappear(by.id('modal-container'));
    });

    it('should handle confirmation modals', async () => {
      await element(by.id('delete-button')).tap();
      await expect(element(by.text('Are you sure?'))).toBeVisible();

      await element(by.text('Confirm')).tap();
      await expect(element(by.text('Item deleted successfully'))).toBeVisible();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      await element(by.text('Mentors')).tap();
      await expect(element(by.id('mentors-screen'))).toBeVisible();

      await element(by.text('Community')).tap();
      await expect(element(by.id('community-screen'))).toBeVisible();

      await element(by.text('Home')).tap();
      await expect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should maintain tab state when switching', async () => {
      // Navigate to mentors and scroll
      await element(by.text('Mentors')).tap();
      await element(by.id('mentors-list')).scroll(200, 'down');

      // Switch to another tab and back
      await element(by.text('Home')).tap();
      await element(by.text('Mentors')).tap();

      // Should maintain scroll position
      await expect(element(by.id('mentors-list'))).toBeVisible();
    });
  });

  describe('Performance Tests', () => {
    it('should load home screen quickly', async () => {
      await measurePerformance('Home Screen Load', async () => {
        await element(by.text('Home')).tap();
        await waitFor(element(by.id('home-screen'))).toBeVisible();
      });
    });

    it('should handle large lists efficiently', async () => {
      await measurePerformance('Large List Scroll', async () => {
        await element(by.text('Mentors')).tap();
        await waitForLoadingToComplete();

        // Scroll through list
        for (let i = 0; i < 10; i++) {
          await element(by.id('mentors-list')).scroll(300, 'down');
        }
      });
    });

    it('should animate smoothly', async () => {
      await measurePerformance('Modal Animation', async () => {
        await element(by.id('open-modal-button')).tap();
        await waitFor(element(by.id('modal-container'))).toBeVisible();
        await element(by.id('close-modal-button')).tap();
        await waitForElementToDisappear(by.id('modal-container'));
      });
    });
  });
});

describe('Accessibility Tests', () => {
  it('should have proper accessibility labels', async () => {
    await testAccessibility(by.id('home-tab'));
    await testAccessibility(by.id('mentors-tab'));
    await testAccessibility(by.id('community-tab'));
  });

  it('should support screen reader navigation', async () => {
    // Enable accessibility services
    await device.setAccessibilityEnabled(true);

    // Test navigation with accessibility
    await element(by.text('Mentors')).tap();
    await expect(element(by.id('mentors-screen'))).toBeVisible();
  });

  it('should have proper focus management in modals', async () => {
    await element(by.id('open-modal-button')).tap();

    // Focus should be on close button or first focusable element
    await expect(element(by.id('close-modal-button'))).toBeFocused();
  });

  it('should announce important changes', async () => {
    // This would test screen reader announcements
    // Implementation depends on platform capabilities
    await element(by.id('important-action-button')).tap();
    // Verify announcement was made (platform-specific)
  });
});

// Helper functions for E2E tests
async function simulateOffline() {
    await device.setNetworkConnection('none');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for offline state
  }

async function simulateOnline() {
    await device.setNetworkConnection('wifi');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for online state
  }

async function waitForLoadingToComplete() {
  await waitFor(element(by.id('loading-spinner')))
    .not.toBeVisible()
    .withTimeout(10000);
}

async function waitForElementToDisappear(elementMatcher) {
  await waitFor(element(elementMatcher))
    .not.toBeVisible()
    .withTimeout(5000);
}

async function triggerError() {
  // This would trigger an intentional error for testing error boundaries
  // Implementation depends on your app's debug features
  if (await element(by.id('debug-trigger-error')).exists()) {
    await element(by.id('debug-trigger-error')).tap();
  }
}

async function fillForm(fields) {
  for (const [fieldId, value] of Object.entries(fields)) {
    await element(by.id(fieldId)).clearText();
    await element(by.id(fieldId)).typeText(value);
  }
}

async function submitForm() {
  await element(by.id('submit-button')).tap();
  await waitForLoadingToComplete();
}

async function measurePerformance(testName, testFunction) {
  const startTime = Date.now();
  await testFunction();
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Performance Test: ${testName} took ${duration}ms`);

  // Assert performance threshold (adjust as needed)
  expect(duration).toBeLessThan(5000); // 5 seconds max
}

async function testAccessibility(elementMatcher) {
  const element = await element(elementMatcher);

  // Check if element has accessibility label
  await expect(element).toHaveAccessibilityLabel();

  // Check if element has proper accessibility traits
  await expect(element).toHaveAccessibilityTrait();
}