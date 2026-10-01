process.env.EXPO_PUBLIC_API_BASE_URL ??= 'http://127.0.0.1:4000';

require('react-native-gesture-handler/jestSetup');

jest.mock('lucide-react-native', () => {
  // Jest mock factories run before ESM imports are available.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native') as typeof import('react-native');

  return new Proxy(
    { __esModule: true },
    {
      get(target, property) {
        if (property in target) {
          return target[property as keyof typeof target];
        }

        return function Icon(props: Record<string, unknown>) {
          return React.createElement(View, props);
        };
      },
    }
  );
});

jest.mock('nativewind', () => {
  // Jest mock factories run before ESM imports are available.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');

  const state: {
    scheme: 'light' | 'dark' | 'system';
    listeners: Set<() => void>;
  } = {
    scheme: 'system',
    listeners: new Set(),
  };

  const setColorScheme = (value: 'light' | 'dark' | 'system') => {
    state.scheme = value;
    state.listeners.forEach((listener) => listener());
  };

  return {
    useColorScheme: () => {
      const [, setTick] = React.useState(0);

      React.useEffect(() => {
        const listener = () => setTick((value) => value + 1);
        state.listeners.add(listener);
        return () => {
          state.listeners.delete(listener);
        };
      }, []);

      return {
        colorScheme: state.scheme === 'dark' ? 'dark' : 'light',
        setColorScheme,
        toggleColorScheme: jest.fn(),
      };
    },
    cssInterop: (component: unknown) => component,
    remapProps: (component: unknown) => component,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  // Jest mock factories run before ESM imports are available.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  const initialMetrics = {
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: 390, height: 844 },
  };

  return {
    ...actual,
    initialWindowMetrics: initialMetrics,
    SafeAreaProvider: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      initialMetrics?: typeof initialMetrics;
    }) =>
      React.createElement(
        actual.SafeAreaProvider,
        { ...props, initialMetrics: props.initialMetrics ?? initialMetrics },
        children
      ),
  };
});

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (c: unknown) => c,
    },
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn() || {},
    withTiming: (toValue: unknown) => toValue,
    withRepeat: (anim: unknown) => anim,
    withSpring: (toValue: unknown) => toValue,
    withSequence: (...anims: unknown[]) => anims[0],
    withDelay: (_delay: unknown, anim: unknown) => anim,
    cancelAnimation: jest.fn(),
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: unknown) => fn,
  };
});
