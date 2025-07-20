import React, { Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface LazyScreenProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200EE" />
  </View>
);

const LazyScreen: React.FC<LazyScreenProps> = ({ 
  component: Component, 
  fallback = <DefaultFallback />,
  ...props 
}) => {
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
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

export default LazyScreen;

// Higher-order component for creating lazy screens
export const withLazyLoading = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(importFn);
  
  return (props: P) => (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};