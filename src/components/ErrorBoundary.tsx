import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Share, Platform } from 'react-native';
import Button from './Button';
import { logger } from '../utils/logger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'screen' | 'component' | 'app';
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error with context
    logger.error('ErrorBoundary caught an error', error, {
      level: this.props.level || 'component',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
    });

    // Report to crash analytics
    this.reportError(error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-retry for component-level errors
    if (this.props.level === 'component' && this.state.retryCount < 2) {
      this.scheduleAutoRetry();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state when resetKeys change
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Report to crash analytics service (e.g., Crashlytics, Sentry)
    try {
      // Example: Crashlytics.recordError(error);
      // Example: Sentry.captureException(error, { extra: errorInfo });
      
      // For now, just log to console in development
      if (__DEV__) {
        console.group('🚨 Error Boundary Report');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Props:', this.props);
        console.error('State:', this.state);
        console.groupEnd();
      }
    } catch (reportingError) {
      logger.error('Failed to report error', reportingError);
    }
  };

  private scheduleAutoRetry = () => {
    this.resetTimeoutId = setTimeout(() => {
      logger.info('Auto-retrying after error');
      this.handleRetry();
    }, 2000) as unknown as number;
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleReportBug = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error) return;

    const errorReport = `
Error ID: ${errorId}
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
App Version: 1.0.0
Platform: ${Platform.OS}
    `.trim();

    try {
      await Share.share({
        message: errorReport,
        title: 'Error Report - AI Hub',
      });
    } catch (shareError) {
      Alert.alert(
        'Error Report',
        'Unable to share error report. Please contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  private handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Would you like to contact our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Email Support', 
          onPress: () => {
            // Open email client or support form
            logger.info('User requested support contact');
          }
        },
      ]
    );
  };

  private renderErrorUI = () => {
    const { error, errorInfo, errorId, retryCount } = this.state;
    const { level = 'component' } = this.props;

    // Different UI based on error level
    switch (level) {
      case 'app':
        return this.renderAppLevelError();
      case 'screen':
        return this.renderScreenLevelError();
      case 'component':
      default:
        return this.renderComponentLevelError();
    }
  };

  private renderAppLevelError = () => (
    <View style={styles.appErrorContainer}>
      <ScrollView contentContainerStyle={styles.appErrorContent}>
        <Text style={styles.appErrorIcon}>💥</Text>
        <Text style={styles.appErrorTitle}>App Crashed</Text>
        <Text style={styles.appErrorMessage}>
          The application has encountered a critical error and needs to restart.
        </Text>
        
        <View style={styles.errorActions}>
          <Button
            title="Restart App"
            onPress={this.handleRetry}
            variant="primary"
            style={styles.actionButton}
          />
          <Button
            title="Report Bug"
            onPress={this.handleReportBug}
            variant="outline"
            style={styles.actionButton}
          />
        </View>

        {__DEV__ && this.renderDeveloperInfo()}
      </ScrollView>
    </View>
  );

  private renderScreenLevelError = () => (
    <View style={styles.screenErrorContainer}>
      <View style={styles.screenErrorContent}>
        <Text style={styles.screenErrorIcon}>⚠️</Text>
        <Text style={styles.screenErrorTitle}>Screen Error</Text>
        <Text style={styles.screenErrorMessage}>
          This screen encountered an error. You can try again or go back.
        </Text>
        
        <View style={styles.errorActions}>
          <Button
            title="Try Again"
            onPress={this.handleRetry}
            variant="primary"
            style={styles.actionButton}
          />
          <Button
            title="Go Back"
            onPress={() => {
              // Navigation.goBack() - implement based on your navigation
              logger.info('User chose to go back from error screen');
            }}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </View>
    </View>
  );

  private renderComponentLevelError = () => (
    <View style={styles.componentErrorContainer}>
      <Text style={styles.componentErrorIcon}>🔧</Text>
      <Text style={styles.componentErrorTitle}>Component Error</Text>
      <Text style={styles.componentErrorMessage}>
        A component failed to load properly.
      </Text>
      
      {this.state.retryCount < 3 && (
        <Button
          title="Retry"
          onPress={this.handleRetry}
          variant="outline"
          size="small"
          style={styles.retryButton}
        />
      )}
    </View>
  );

  private renderDeveloperInfo = () => {
    const { error, errorInfo } = this.state;
    
    return (
      <View style={styles.developerInfo}>
        <Text style={styles.developerTitle}>Developer Information</Text>
        
        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Error:</Text>
            <Text style={styles.errorText}>{error.toString()}</Text>
          </View>
        )}
        
        {error?.stack && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Stack Trace:</Text>
            <ScrollView style={styles.stackTrace} horizontal>
              <Text style={styles.errorText}>{error.stack}</Text>
            </ScrollView>
          </View>
        )}
        
        {errorInfo?.componentStack && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Component Stack:</Text>
            <ScrollView style={styles.stackTrace} horizontal>
              <Text style={styles.errorText}>{errorInfo.componentStack}</Text>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Isolate error to prevent cascading failures
      if (this.props.isolate) {
        return (
          <View style={styles.isolatedError}>
            <Text style={styles.isolatedErrorText}>Component unavailable</Text>
          </View>
        );
      }

      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specialized error boundaries
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="app" resetOnPropsChange={false}>
    {children}
  </ErrorBoundary>
);

export const ScreenErrorBoundary: React.FC<{ 
  children: ReactNode;
  resetKeys?: Array<string | number>;
}> = ({ children, resetKeys }) => (
  <ErrorBoundary level="screen" resetOnPropsChange resetKeys={resetKeys}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  isolate?: boolean;
}> = ({ children, isolate = false }) => (
  <ErrorBoundary level="component" isolate={isolate}>
    {children}
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  // App-level error styles
  appErrorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appErrorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  appErrorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  appErrorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  appErrorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },

  // Screen-level error styles
  screenErrorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenErrorContent: {
    alignItems: 'center',
    padding: 24,
  },
  screenErrorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  screenErrorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  screenErrorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Component-level error styles
  componentErrorContainer: {
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
    alignItems: 'center',
    margin: 8,
  },
  componentErrorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  componentErrorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  componentErrorMessage: {
    fontSize: 14,
    color: '#BF360C',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Isolated error styles
  isolatedError: {
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    alignItems: 'center',
  },
  isolatedErrorText: {
    fontSize: 12,
    color: '#C62828',
    fontStyle: 'italic',
  },

  // Common styles
  errorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    minWidth: 120,
    marginHorizontal: 6,
  },
  retryButton: {
    minWidth: 80,
  },

  // Developer info styles
  developerInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '100%',
  },
  developerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  errorSection: {
    marginBottom: 16,
  },
  errorSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  stackTrace: {
    maxHeight: 120,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default ErrorBoundary;