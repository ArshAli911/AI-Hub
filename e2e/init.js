const { device, expect, element, by, waitFor } = require('detox');

// Global test setup
beforeAll(async () => {
  await device.launchApp();
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// Custom matchers and utilities
global.waitForElementToBeVisible = async (elementMatcher, timeout = 10000) => {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .withTimeout(timeout);
};

global.waitForElementToDisappear = async (elementMatcher, timeout = 10000) => {
  await waitFor(element(elementMatcher))
    .not.toBeVisible()
    .withTimeout(timeout);
};

// Accessibility testing helpers
global.testAccessibility = async (elementMatcher) => {
  const el = element(elementMatcher);
  
  // Check if element has accessibility label
  await expect(el).toHaveAccessibilityLabel();
  
  // Check if element is accessible
  await expect(el).toBeVisible();
};

// Network simulation helpers
global.simulateOffline = async () => {
  await device.setNetworkConnection('none');
};

global.simulateOnline = async () => {
  await device.setNetworkConnection('wifi');
};

// Performance testing helpers
global.measurePerformance = async (testName, testFunction) => {
  const startTime = Date.now();
  await testFunction();
  const endTime = Date.now();
  
  console.log(`Performance: ${testName} took ${endTime - startTime}ms`);
  
  // Fail if test takes too long
  if (endTime - startTime > 5000) {
    throw new Error(`Performance test failed: ${testName} took ${endTime - startTime}ms (max: 5000ms)`);
  }
};

// Error boundary testing
global.triggerError = async () => {
  // This would trigger an error in the app for testing error boundaries
  await element(by.id('error-trigger-button')).tap();
};

// Form testing helpers
global.fillForm = async (formData) => {
  for (const [fieldId, value] of Object.entries(formData)) {
    await element(by.id(fieldId)).typeText(value);
  }
};

global.submitForm = async () => {
  await element(by.id('submit-button')).tap();
};

// Loading state testing
global.waitForLoadingToComplete = async (timeout = 10000) => {
  await waitFor(element(by.id('loading-spinner')))
    .not.toBeVisible()
    .withTimeout(timeout);
};