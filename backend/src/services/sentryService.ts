import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import logger from './loggerService';

export const initializeSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('SENTRY_DSN not found in environment variables. Sentry will not be initialized.');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app: undefined }),
        // Automatically instrument Node.js libraries and frameworks
        new Sentry.Integrations.Node(),
        // Profiling integration
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Enable debug mode in development
      debug: process.env.NODE_ENV === 'development',
      // Before sending, add additional context
      beforeSend(event: Sentry.Event) {
        // Add custom context
        event.extra = {
          ...event.extra,
          timestamp: new Date().toISOString(),
          processId: process.pid,
        };
        return event;
      },
    });

    logger.info('Sentry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  try {
    if (context) {
      Sentry.withScope((scope: Sentry.Scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (sentryError) {
    logger.error('Failed to capture exception in Sentry:', sentryError);
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  try {
    if (context) {
      Sentry.withScope((scope: Sentry.Scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  } catch (sentryError) {
    logger.error('Failed to capture message in Sentry:', sentryError);
  }
};

export const setUserContext = (userId: string, email?: string, additionalData?: Record<string, any>) => {
  try {
    Sentry.setUser({
      id: userId,
      email,
      ...additionalData,
    });
  } catch (error) {
    logger.error('Failed to set user context in Sentry:', error);
  }
};

export const clearUserContext = () => {
  try {
    Sentry.setUser(null);
  } catch (error) {
    logger.error('Failed to clear user context in Sentry:', error);
  }
};

export default Sentry; 