const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
const baseManifest = require('./src/chrome/manifest.json');
const common = require('./webpack.common.js');
const pkg = require('./package.json');

const PACKAGE_NAME = 'FoE-Info';
const date = new Date().toISOString().substr(0, 10);

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'build', `${PACKAGE_NAME}_WEBSTORE`),
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2020,
          compress: {
            drop_console: false,
            pure_funcs: ['console.info', 'console.debug'],
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
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
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new webpack.DefinePlugin({
      EXT_NAME: JSON.stringify(PACKAGE_NAME),
      WEBSTORE: true,
      DEV: false,
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
    new ZipPlugin({
      path: '../',
      filename: `${PACKAGE_NAME}_WEBSTORE_${pkg.version}_${date}.zip`,
    }),
  ],
});
