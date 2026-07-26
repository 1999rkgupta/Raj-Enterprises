const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo workspace
config.watchFolders = [workspaceRoot];

// 2. Priority resolution paths for Metro bundler
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Disable hierarchical lookup to prevent Metro from picking up duplicate nested packages
config.resolver.disableHierarchicalLookup = true;

// 4. Force extraNodeModules mapping for monorepo packages
config.resolver.extraNodeModules = {
  react: path.dirname(require.resolve('react/package.json')),
  'react-native': path.dirname(require.resolve('react-native/package.json')),
  'react-redux': path.dirname(require.resolve('react-redux/package.json')),
  '@reduxjs/toolkit': path.dirname(require.resolve('@reduxjs/toolkit/package.json')),
};

module.exports = config;
