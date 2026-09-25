/**
 * @format
 */

// 🚀 Nitro must be loaded before any React Native code
import 'react-native-nitro-modules';

import { AppRegistry } from 'react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';
import { name as appName } from './app.json';

// Optional: silence some RN dev warnings
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['new NativeEventEmitter']);

const Root = () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
);

AppRegistry.registerComponent(appName, () => Root);
