const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    app: './src/js/index.js',
    options: './src/js/options.js',
    devtools: './src/js/devtools.js',
    popup: './src/js/popup.js',
    xhrInterceptor: './src/js/protocol/xhrInterceptor.js',
    contentBridge: './src/js/protocol/contentBridge.js',
  },
  output: {
    clean: true,
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
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
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      browser: 'webextension-polyfill',
    }),
    new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
      title: 'FoE-Info',
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
        { from: './src/i18n', to: 'i18n' },
        { from: './src/icons/common', to: 'icons' },
        { from: './src/icons/foe-info', to: 'icons' },
        { from: './src/images', to: 'images', noErrorOnMissing: true },
      ],
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
    fallback: {
      fs: false,
    },
  },
};
