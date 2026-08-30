const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
const baseManifest = require('./src/chrome/manifest.json');
const common = require('./webpack.common.js');
const pkg = require('./package.json');

const PACKAGE_NAME = 'FoE-Info-DEV';

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'build', PACKAGE_NAME),
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'build', PACKAGE_NAME),
    },
    hot: true,
    port: 3000,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      EXT_NAME: JSON.stringify(PACKAGE_NAME),
      DEV: true,
      WEBSTORE: false,
    }),
    new WebpackExtensionManifestPlugin({
      config: {
        base: baseManifest,
        extend: {
          name: PACKAGE_NAME,
          short_name: PACKAGE_NAME,
          version: pkg.version,
        },
      },
    }),
  ],
});
