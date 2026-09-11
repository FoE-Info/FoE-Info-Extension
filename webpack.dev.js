/**
 * FoE-Info Dev Webpack Configuration
 * Delegates to dynamic webpack.config.js with target='dev'.
 */
const configure = require('./webpack.config.js');

module.exports = (env = {}, argv = {}) => {
  return configure({ ...env, target: 'dev' }, argv);
};
