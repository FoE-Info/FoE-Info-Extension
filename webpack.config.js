/**
 * Root Webpack Configuration Proxy
 * Resolves configuration for tools and agents expecting a default webpack.config.js.
 * Delegates to webpack.dev.js (default) or webpack.prod.js based on mode/env.
 */
module.exports = (env, argv) => {
  if (argv && argv.mode === 'production') {
    return require('./webpack.prod.js');
  }
  return require('./webpack.dev.js');
};
