/**
 * @format
 */

// 🚀 Nitro must be loaded before any React Native code
import 'react-native-nitro-modules';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Optional: silence some RN dev warnings
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['new NativeEventEmitter']);

AppRegistry.registerComponent(appName, () => App);
