# AI Companion Mobile App

This directory contains the React Native mobile application for the AI Companion project.

## Project Structure

- `android/`: Native Android project files.
- `ios/`: Native iOS project files.
- `assets/`: Static assets like images, icons, and fonts.
- `src/`: Source code for the application.
  - `api/`: API service handlers.
  - `components/`: Reusable UI components.
  - `constants/`: Global constants (e.g., colors, themes, sizes).
  - `context/`: React Contexts for global state management (e.g., authentication).
  - `hooks/`: Custom React hooks.
  - `navigation/`: Navigation setup using React Navigation.
  - `screens/`: Page-level components, organized by feature.
  - `services/`: External service integrations (e.g., Firebase, Stripe).
  - `state/`: Application-wide state management (e.g., Zustand).
  - `utils/`: Utility functions.
  - `types/`: TypeScript type definitions.
  - `App.tsx`: Main application entry point.

## Getting Started

1.  **Install Dependencies:** Navigate to this directory (`AI-Companion-App/`) and run `npm install`.
2.  **Environment Variables:** Create a `.env` file in the root of this directory (if it doesn't exist) with `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api`.
3.  **Run the app:**
    -   `npm start` (to open Expo Dev Tools in your browser)
    -   `npm run android` (to run on Android emulator/device)
    -   `npm run ios` (to run on iOS simulator/device - macOS required)

## Assets

Ensure you have the following placeholder image files in the `assets/` directory:
- `icon.png`
- `splash.png`
- `favicon.png`
- `adaptive-icon.png`

These are referenced in `app.json`. 