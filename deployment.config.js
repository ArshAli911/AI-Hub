module.exports = {
  // Environment configurations
  environments: {
    development: {
      name: 'Development',
      apiUrl: 'http://localhost:3000',
      websocketUrl: 'ws://localhost:3001',
      firebase: {
        projectId: 'ai-hub-dev',
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV,
        authDomain: 'ai-hub-dev.firebaseapp.com',
        storageBucket: 'ai-hub-dev.appspot.com',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV,
      },
      sentry: {
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN_DEV,
        environment: 'development',
      },
      stripe: {
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_DEV,
        secretKey: process.env.STRIPE_SECRET_KEY_DEV,
      },
      features: {
        enableAnalytics: false,
        enableCrashReporting: false,
        enablePerformanceMonitoring: true,
        enableDebugMode: true,
      },
    },
    staging: {
      name: 'Staging',
      apiUrl: 'https://api-staging.ai-hub.com',
      websocketUrl: 'wss://ws-staging.ai-hub.com',
      firebase: {
        projectId: 'ai-hub-staging',
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_STAGING,
        authDomain: 'ai-hub-staging.firebaseapp.com',
        storageBucket: 'ai-hub-staging.appspot.com',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_STAGING,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_STAGING,
      },
      sentry: {
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN_STAGING,
        environment: 'staging',
      },
      stripe: {
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_STAGING,
        secretKey: process.env.STRIPE_SECRET_KEY_STAGING,
      },
      features: {
        enableAnalytics: true,
        enableCrashReporting: true,
        enablePerformanceMonitoring: true,
        enableDebugMode: false,
      },
    },
    production: {
      name: 'Production',
      apiUrl: 'https://api.ai-hub.com',
      websocketUrl: 'wss://ws.ai-hub.com',
      firebase: {
        projectId: 'ai-hub-prod',
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_PROD,
        authDomain: 'ai-hub-prod.firebaseapp.com',
        storageBucket: 'ai-hub-prod.appspot.com',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_PROD,
      },
      sentry: {
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN_PROD,
        environment: 'production',
      },
      stripe: {
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD,
        secretKey: process.env.STRIPE_SECRET_KEY_PROD,
      },
      features: {
        enableAnalytics: true,
        enableCrashReporting: true,
        enablePerformanceMonitoring: true,
        enableDebugMode: false,
      },
    },
  },

  // Build configurations
  builds: {
    android: {
      development: {
        buildType: 'apk',
        buildVariant: 'debug',
        keystore: null,
        bundleIdentifier: 'com.aihub.app.dev',
        versionCode: 1,
        versionName: '1.0.0-dev',
      },
      staging: {
        buildType: 'aab',
        buildVariant: 'release',
        keystore: {
          keystorePath: './android/app/keystore-staging.jks',
          keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD_STAGING,
          keyAlias: process.env.ANDROID_KEY_ALIAS_STAGING,
          keyPassword: process.env.ANDROID_KEY_PASSWORD_STAGING,
        },
        bundleIdentifier: 'com.aihub.app.staging',
        versionCode: 2,
        versionName: '1.0.0-staging',
      },
      production: {
        buildType: 'aab',
        buildVariant: 'release',
        keystore: {
          keystorePath: './android/app/keystore-prod.jks',
          keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD_PROD,
          keyAlias: process.env.ANDROID_KEY_ALIAS_PROD,
          keyPassword: process.env.ANDROID_KEY_PASSWORD_PROD,
        },
        bundleIdentifier: 'com.aihub.app',
        versionCode: 3,
        versionName: '1.0.0',
      },
    },
    ios: {
      development: {
        buildType: 'simulator',
        buildConfiguration: 'Debug',
        provisioningProfile: null,
        bundleIdentifier: 'com.aihub.app.dev',
        versionCode: 1,
        versionName: '1.0.0-dev',
      },
      staging: {
        buildType: 'device',
        buildConfiguration: 'Release',
        provisioningProfile: {
          path: './ios/AIHub_Staging.mobileprovision',
          uuid: process.env.IOS_PROVISIONING_PROFILE_UUID_STAGING,
        },
        bundleIdentifier: 'com.aihub.app.staging',
        versionCode: 2,
        versionName: '1.0.0-staging',
      },
      production: {
        buildType: 'device',
        buildConfiguration: 'Release',
        provisioningProfile: {
          path: './ios/AIHub_Production.mobileprovision',
          uuid: process.env.IOS_PROVISIONING_PROFILE_UUID_PROD,
        },
        bundleIdentifier: 'com.aihub.app',
        versionCode: 3,
        versionName: '1.0.0',
      },
    },
  },

  // CI/CD configurations
  ci: {
    github: {
      workflows: {
        test: {
          name: 'Test',
          triggers: ['push', 'pull_request'],
          jobs: ['lint', 'test', 'build'],
        },
        deploy_staging: {
          name: 'Deploy to Staging',
          triggers: ['push_to_main'],
          jobs: ['build_android_staging', 'build_ios_staging', 'deploy_staging'],
        },
        deploy_production: {
          name: 'Deploy to Production',
          triggers: ['release'],
          jobs: ['build_android_production', 'build_ios_production', 'deploy_production'],
        },
      },
    },
    gitlab: {
      stages: ['test', 'build', 'deploy'],
      jobs: {
        test: {
          stage: 'test',
          script: ['npm run lint', 'npm run test', 'npm run build'],
        },
        build_android: {
          stage: 'build',
          script: ['npm run build:android'],
          artifacts: {
            paths: ['android/app/build/outputs/'],
            expire_in: '1 week',
          },
        },
        build_ios: {
          stage: 'build',
          script: ['npm run build:ios'],
          artifacts: {
            paths: ['ios/build/'],
            expire_in: '1 week',
          },
        },
        deploy_staging: {
          stage: 'deploy',
          script: ['npm run deploy:staging'],
          environment: {
            name: 'staging',
            url: 'https://staging.ai-hub.com',
          },
        },
        deploy_production: {
          stage: 'deploy',
          script: ['npm run deploy:production'],
          environment: {
            name: 'production',
            url: 'https://ai-hub.com',
          },
        },
      },
    },
  },

  // Deployment targets
  deployment: {
    stores: {
      google_play: {
        enabled: true,
        track: 'internal', // internal, alpha, beta, production
        releaseNotes: {
          'en-US': 'Bug fixes and performance improvements',
          'es-ES': 'Correcciones de errores y mejoras de rendimiento',
        },
        metadata: {
          title: 'AI Hub',
          shortDescription: 'AI-powered learning platform',
          fullDescription: 'Connect with mentors, share prototypes, and learn AI technologies.',
          keywords: ['AI', 'learning', 'mentors', 'prototypes'],
          category: 'Education',
          contentRating: 'Everyone',
        },
      },
    },
    firebase: {
      hosting: {
        enabled: true,
        public: 'web-build',
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        rewrites: [
          {
            source: '**',
            destination: '/index.html',
          },
        ],
      },
      functions: {
        enabled: true,
        runtime: 'nodejs18',
        region: 'us-central1',
        memory: '256MB',
        timeoutSeconds: 60,
      },
    },
  },

  // Monitoring and analytics
  monitoring: {
    sentry: {
      enabled: true,
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
    },
    firebase: {
      analytics: {
        enabled: true,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      },
      crashlytics: {
        enabled: true,
        projectId: process.env.FIREBASE_PROJECT_ID,
      },
      performance: {
        enabled: true,
        projectId: process.env.FIREBASE_PROJECT_ID,
      },
    },
    custom: {
      enabled: true,
      endpoint: process.env.MONITORING_ENDPOINT,
      apiKey: process.env.MONITORING_API_KEY,
    },
  },

  // Security configurations
  security: {
    codeSigning: {
      android: {
        enabled: true,
        keystorePath: './android/app/keystore.jks',
        keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
        keyAlias: process.env.ANDROID_KEY_ALIAS,
        keyPassword: process.env.ANDROID_KEY_PASSWORD,
      },
      ios: {
        enabled: true,
        certificatePath: './ios/certificates/distribution.p12',
        certificatePassword: process.env.IOS_CERTIFICATE_PASSWORD,
        provisioningProfilePath: './ios/provisioning-profiles/distribution.mobileprovision',
      },
    },
    secrets: {
      encryptionKey: process.env.ENCRYPTION_KEY,
      jwtSecret: process.env.JWT_SECRET,
      apiKey: process.env.API_KEY,
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    },
  },

  // Database configurations
  database: {
    firestore: {
      enabled: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      rules: './firestore.rules',
      indexes: './firestore.indexes.json',
    },
    realtime: {
      enabled: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      rules: './database.rules.json',
    },
    backup: {
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      retention: '30d',
      storage: 'gs://ai-hub-backups',
    },
  },

  // Storage configurations
  storage: {
    firebase: {
      enabled: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      bucket: process.env.FIREBASE_STORAGE_BUCKET,
      rules: './storage.rules',
    },
    cdn: {
      enabled: true,
      domain: 'cdn.ai-hub.com',
      provider: 'cloudflare',
      cacheControl: 'public, max-age=31536000',
    },
  },

  // Notification configurations
  notifications: {
    firebase: {
      enabled: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      serverKey: process.env.FIREBASE_SERVER_KEY,
    },
    expo: {
      enabled: true,
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      projectId: process.env.EXPO_PROJECT_ID,
    },
  },

  // Payment configurations
  payments: {
    stripe: {
      enabled: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      enabled: false,
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    },
  },

  // Feature flags
  features: {
    enableBetaFeatures: process.env.ENABLE_BETA_FEATURES === 'true',
    enableExperimentalUI: process.env.ENABLE_EXPERIMENTAL_UI === 'true',
    enableAdvancedAnalytics: process.env.ENABLE_ADVANCED_ANALYTICS === 'true',
    enableAITeaching: process.env.ENABLE_AI_TEACHING === 'true',
    enableVideoCalls: process.env.ENABLE_VIDEO_CALLS === 'true',
    enableOfflineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
  },
}; 