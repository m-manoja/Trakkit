const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg', 'mjs', 'cjs', 'js', 'json'],
  // Manual alias to fix the react-async-hook resolution error
  extraNodeModules: new Proxy({}, {
    get: (target, name) => {
      if (name === 'react-async-hook') {
        return path.resolve(__dirname, 'node_modules/react-async-hook');
      }
      return path.resolve(__dirname, 'node_modules', name);
    },
  }),
};

module.exports = config;