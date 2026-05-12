const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const sdkPath = path.resolve(__dirname, '../sdk');
const appNodeModules = path.resolve(__dirname, 'node_modules');

const config = {
  transformer: {
    unstable_disableES6Transforms: false,
  },
  watchFolders: [sdkPath],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [appNodeModules],
    extraNodeModules: {
      'gomarketme-react-native': sdkPath,
      react: path.join(appNodeModules, 'react'),
      'react-native': path.join(appNodeModules, 'react-native'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);