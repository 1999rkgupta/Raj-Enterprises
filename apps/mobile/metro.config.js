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

// 3. Custom resolveRequest to force deduplication of React and React Native across the entire monorepo
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect all React imports to the mobile app's local version (React 18.2.0)
  if (moduleName === 'react') {
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, 'node_modules/react'),
      platform
    );
  }
  // Redirect all React Native imports to the mobile app's local version (React Native 0.74.5)
  if (moduleName === 'react-native') {
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, 'node_modules/react-native'),
      platform
    );
  }
  // Let Metro resolve everything else normally
  return context.resolveRequest(context, moduleName, platform);
};

// 4. Fallback extraNodeModules for non-standard package structures
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-redux': path.resolve(projectRoot, 'node_modules/react-redux'),
  '@reduxjs/toolkit': path.resolve(projectRoot, 'node_modules/@reduxjs/toolkit'),
};

module.exports = config;
