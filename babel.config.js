module.exports = {
  presets: ['module:@react-native/babel-preset'],

  plugins: [
    // keep any global plugins here (for example, Reanimated)
    // 'react-native-reanimated/plugin',
  ],

  overrides: [
    {
      // 🩹 Patch the broken RN internal file for Node 20+ / Hermes
      test: /virtualview\/VirtualViewNativeComponent\.js$/,
      plugins: [
        () => ({
          visitor: {
            Program(path) {
              // Completely clear file body so codegen won't run on it
              path.node.body = [];
            },
          },
        }),
      ],
    },
  ],
};
