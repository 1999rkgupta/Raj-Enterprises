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

// 3. Dynamic extraNodeModules Proxy to resolve all packages from either apps/mobile or workspaceRoot
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (typeof name === 'symbol') return undefined;
      if (target[name]) return target[name];
      try {
        return path.dirname(
          require.resolve(`${name}/package.json`, {
            paths: [projectRoot, workspaceRoot],
          })
        );
      } catch {
        return path.join(workspaceRoot, 'node_modules', name);
      }
    },
  }
);

module.exports = config;
