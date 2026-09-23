import 'react-native-gesture-handler';
import './global.css';

import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import { App } from '@/shell/App';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

registerRootComponent(App);
