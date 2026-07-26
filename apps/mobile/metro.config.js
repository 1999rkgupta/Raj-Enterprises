const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo workspace
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what priority order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Resolve the actual installed paths using require.resolve to support monorepo hoisting on EAS / local builds
const reactPath = path.dirname(require.resolve('react/package.json'));
const reactNativePath = path.dirname(require.resolve('react-native/package.json'));
const reactReduxPath = path.dirname(require.resolve('react-redux/package.json'));
const reduxjsToolkitPath = path.dirname(require.resolve('@reduxjs/toolkit/package.json'));

// 4. Custom resolveRequest to force deduplication of React and React Native across the entire monorepo
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return context.resolveRequest(context, reactPath, platform);
  }
  if (moduleName === 'react-native') {
    return context.resolveRequest(context, reactNativePath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 5. Fallback extraNodeModules for non-standard package structures
config.resolver.extraNodeModules = {
  react: reactPath,
  'react-native': reactNativePath,
  'react-redux': reactReduxPath,
  '@reduxjs/toolkit': reduxjsToolkitPath,
};

module.exports = config;
