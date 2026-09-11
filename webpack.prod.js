/**
 * FoE-Info Production Webpack Configuration
 * Delegates to dynamic webpack.config.js with target='prod'.
 */
const configure = require('./webpack.config.js');

module.exports = (env = {}, argv = {}) => {
  return configure({ ...env, target: 'prod' }, argv);
};
