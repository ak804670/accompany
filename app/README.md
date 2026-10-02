# Accompany — mobile app

React Native app for Accompany, a companionship platform for conversation and good company. This package is the iOS and Android app. The API lives in `backend/` and the web client lives in `web/`, both at the repository root.

## Prerequisites

- Node.js 20 or newer
- npm
- An Android emulator or device; GIPHY's native picker requires the Accompany development client, not Expo Go
- Xcode and an iOS Simulator to run iOS (macOS only)

## Installation

```bash
npm install
cp .env.example .env
```

`.env` is optional for local startup. The app boots without it. API calls fail until `EXPO_PUBLIC_API_BASE_URL` is set. Do not commit `.env`.

## Development

```bash
npm start
```

Build and install the native development client once with `npm run android` or `npm run ios`. Then `npm start` opens the app in that client. `npm run start:go` is available for screens that do not use native-only modules; GIPHY is unavailable in Expo Go.

### iOS

```bash
npm run ios
```

This requires macOS with Xcode installed.

### Android

```bash
npm run android
```

This requires an Android emulator or a connected device.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run format
npm test
```

## Environment

Copy `.env.example` to `.env`.

Add platform-specific GIPHY SDK keys to `.env` before using the GIF picker. GIPHY requires separate Android and iOS SDK keys. Rebuild the native development client after installing native packages or changing native app configuration.

| Variable                   | Values                                    |
| -------------------------- | ----------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`      | `development`, `staging`, or `production` |
| `EXPO_PUBLIC_API_BASE_URL` | API origin                                |
| `EXPO_PUBLIC_WS_BASE_URL`  | WebSocket origin                          |
| `EXPO_PUBLIC_GIPHY_ANDROID_SDK_KEY` | GIPHY Android SDK key |
| `EXPO_PUBLIC_GIPHY_IOS_SDK_KEY`     | GIPHY iOS SDK key |

Read these through `src/services/env.ts`. Do not hardcode URLs in screens.

## Folder structure

```text
src/
├── shell/                App shell and error boundary
├── components/
│   ├── ui/               React Native Reusables primitives
│   └── design-system/    App-facing components
├── navigation/           Root navigation
├── services/
│   ├── api/              HTTP client
│   ├── storage/          Secure storage and preferences
│   └── monitoring/       Error reporting seam
├── theme/                Tokens and theme provider
└── lib/                  Shared helpers
```

Feature folders (`auth`, `profile`, `discovery`, and the rest) are added when those features are built. See `docs/architecture.md`.

## UI primitives

Low-level components come from [React Native Reusables](https://reactnativereusables.com). Add another primitive with:

```bash
npx @react-native-reusables/cli@latest add <name> -y
```

Screens should use `src/components/design-system`, not the primitives directly.
