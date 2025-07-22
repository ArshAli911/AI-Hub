import React, { useEffect, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet, InteractionManager } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { performanceMonitor } from './utils/performanceMonitor';
import { codeSplitting } from './utils/bundleOptimizer';

// App loading component
const AppLoading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200EE" />
  </View>
);

const App = () => {
  useEffect(() => {
    // Start app performance monitoring
    performanceMonitor.startTiming('app_startup');

    // Preload critical features after interactions complete
    InteractionManager.runAfterInteractions(() => {
      codeSplitting.preloadCriticalFeatures().catch(err => 
        console.warn('Failed to preload critical features:', err)
      );
      
      // End app startup timing
      performanceMonitor.endTiming('app_startup');
    });

    // Cleanup on unmount
    return () => {
      // Performance monitor cleanup handled automatically
    };
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoading />}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App; 