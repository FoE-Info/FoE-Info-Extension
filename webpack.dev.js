const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
const common = require('./webpack.common.js');
const baseManifest = require('./src/chrome/manifest.json');
const pkg = require('./package.json');

const PACKAGE_NAME = 'FoE-Info-DEV';
process.env.NODE_ENV = 'development';

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                quietDeps: true,
              },
            },
          },
        ],
      },
    ],
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'build/' + PACKAGE_NAME),
    },
    hot: true,
    port: 3000,
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build/' + PACKAGE_NAME),
    publicPath: '/',
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
          version: pkg.version,
          name: PACKAGE_NAME,
          short_name: PACKAGE_NAME,
        },
      },
    }),
  ],
});
