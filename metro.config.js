const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    unstable_disableES6Transforms: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
