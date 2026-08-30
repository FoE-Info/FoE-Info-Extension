const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
const baseManifest = require('./src/chrome/manifest.json');
const pkg = require('./package.json');

module.exports = {
  entry: {
    app: './src/js/index.js',
    options: './src/js/options.js',
    devtools: './src/js/devtools.js',
    popup: './src/js/popup.js',
    xhrInterceptor: './src/js/xhr-interceptor.js',
    contentBridge: './src/js/content-bridge.js',
  },
  output: {
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      browser: 'webextension-polyfill',
    }),
    new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
      title: 'FoE-Info',
      manifest: 'manifest.json',
      filename: 'panel.html',
      template: './src/chrome/panel.html',
      chunks: ['app'],
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info Options',
      filename: 'options.html',
      template: './src/chrome/options.html',
      chunks: ['options'],
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info Popup',
      filename: 'popup.html',
      template: './src/chrome/popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info DevTools',
      filename: 'devtools.html',
      template: './src/chrome/devtools.html',
      chunks: ['devtools'],
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
          to: './',
        },
        {
          from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js.map',
          to: './',
          noErrorOnMissing: true,
        },
        { from: './src/i18n', to: 'i18n' },
        { from: './src/icons/common', to: 'icons' },
        { from: './src/icons/foe-info', to: 'icons' },
      ],
    }),
  ],
  resolve: {
    fallback: {
      fs: false,
    },
  },
};
