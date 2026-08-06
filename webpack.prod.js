const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
const common = require('./webpack.common.js');
const baseManifest = require('./src/chrome/manifest_release.json');
const pkg = require('./package.json');

const PACKAGE_NAME = 'FoE-Info';
const date = new Date().toISOString().substr(0, 10);
process.env.NODE_ENV = 'production';

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2018,
          compress: {
            pure_funcs: ['console.info', 'console.debug'],
          },
          format: {
            comments: false,
          },
          mangle: true,
        },
        extractComments: false,
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
    ],
  },
  output: {
    filename: '[name].js',
    chunkFilename: '[name].js',
    path: path.resolve(__dirname, 'build/' + PACKAGE_NAME + '_WEBSTORE'),
    publicPath: '/',
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new webpack.DefinePlugin({
      EXT_NAME: JSON.stringify(PACKAGE_NAME),
      WEBSTORE: true,
      DEV: false,
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
    new ZipPlugin({
      path: '../',
      filename: PACKAGE_NAME + '_WEBSTORE_' + pkg.version + '_' + date + '.zip',
    }),
  ],
});
