const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo workspace
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve packages in workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Prevent duplicate module resolution across monorepo packages
config.resolver.disableHierarchicalLookup = true;

// 4. Force Metro to resolve react and react-native to single monorepo modules
config.resolver.extraNodeModules = new Proxy({}, {
  get: (target, name) => {
    if (name === 'react') return path.resolve(workspaceRoot, 'node_modules/react');
    if (name === 'react-native') return path.resolve(workspaceRoot, 'node_modules/react-native');
    return path.resolve(projectRoot, 'node_modules', name);
  },
});

module.exports = config;
