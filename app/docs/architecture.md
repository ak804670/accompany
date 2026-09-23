# Frontend architecture

This document describes the mobile app in `app/`. The API and web client are separate packages at the repository root and are not implemented yet.

## Stack

- Expo and React Native
- TypeScript in strict mode
- React Native Reusables for low-level UI primitives
- NativeWind and Tailwind CSS for styling
- React Navigation native stack
- ESLint, Prettier, and Jest

Expo is the app runtime because React Native Reusables and NativeWind are set up for it. Navigation lives in `src/navigation` so later stacks can be added without file-based routing.

## Component hierarchy

```text
React Native
  -> React Native Reusables (`src/components/ui`)
  -> Design system (`src/components/design-system`)
  -> Product components (`src/components/product`, not created yet)
  -> Feature screens
```

Screens use design-system components such as `AppButton`. Those components wrap Reusables primitives and consume semantic tokens (`bg-primary`, `text-body-m`). Screens should not style primitives with raw color values.

`src/components/product` is reserved for components shared across features. It is not part of this foundation.

## Theme

`ThemeProvider` supports `light`, `dark`, and `system`. The preference is stored in preferences storage. NativeWind applies the resolved scheme, and React Navigation receives the same scheme through `NAV_THEME`.

Design tokens live in `src/theme/tokens.ts` and `global.css`.

- Colors follow the product palette. Secondary and accent controls reuse the border color so they stay inside that palette.
- Spacing is 4, 8, 16, 24, 32, and 48. Design-system layout uses the Tailwind aliases `xs`, `sm`, `md`, `lg`, `xl`, and `2xl`.
- Radius is 8, 16, 24, and 999 (`rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`).
- Typography is Inter: Display, H1, H2, H3, Body/L, Body/M, Body/S, Label, and Caption. `AppText` is the only supported type API.

## Navigation

`RootNavigator` is a native stack with one screen, `Foundation`. That screen proves navigation, theme switching, and `AppButton`.

Later stacks can be mounted from this root without changing screens that already use the design system:

- Auth stack
- Main app
- Modal stack

Those navigators are not implemented.

## Services

- `src/services/env.ts` reads `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_API_BASE_URL`, and `EXPO_PUBLIC_WS_BASE_URL`.
- `apiClient` exposes `get`, `post`, `put`, and `delete`. It uses `fetch` and the configured base URL. It does not call a backend and does not attach credentials.
- `secureStorage` uses Expo SecureStore for values such as access and refresh tokens. `preferencesStorage` uses AsyncStorage for non-sensitive preferences, including the theme. Device information and user preferences have reserved keys and no writers yet.
- `reportError` is the error-reporting function used by the root error boundary. Replace its reporter when an error-monitoring service is added. UI components should keep calling `reportError`.

## State

Local component state is used for local UI. Theme is the only global context. There is no global state library.

## Feature ownership

Business logic belongs under `src/features/<feature>` when a feature starts. A feature can contain its own components, screens, hooks, and services. Nothing in this foundation implements auth, profiles, discovery, connections, chat, wallet, payments, earnings, notifications, safety, or settings.

## Path aliases

`@/*` maps to `src/*`.
