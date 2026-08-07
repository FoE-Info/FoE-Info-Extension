const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    app: './src/js/index.js',
    options: './src/js/options.js',
    devtools: './src/js/devtools.js',
    popup: './src/js/popup.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
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
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      browser: 'browser',
    }),
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin({
      verbose: true,
      cleanStaleWebpackAssets: false,
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info',
      manifest: 'manifest.json',
      filename: 'panel.html',
      template: './src/chrome/panel.html',
      chunks: ['vendors', 'app'],
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info',
      filename: 'options.html',
      template: './src/chrome/options.html',
      chunks: ['vendors', 'options'],
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info',
      filename: 'popup.html',
      template: './src/chrome/popup.html',
      chunks: ['vendors', 'popup'],
    }),
    new HtmlWebpackPlugin({
      title: 'FoE-Info',
      filename: 'devtools.html',
      template: './src/chrome/devtools.html',
      chunks: ['vendors', 'devtools'],
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
        { from: 'src/images/logo90.png', to: 'icons/' },
      ],
    }),
  ],
  resolve: {
    fallback: {
      fs: false,
    },
  },
};
