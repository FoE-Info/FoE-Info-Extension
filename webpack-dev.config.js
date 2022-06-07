// import webpack from 'webpack';

var webpack = require('webpack'),
  path = require('path'),
  fileSystem = require('fs');

  const MiniCssExtractPlugin = require("mini-css-extract-plugin");
  const  { CleanWebpackPlugin } = require('clean-webpack-plugin');
  const CopyPlugin = require('copy-webpack-plugin');
  const HtmlWebpackPlugin = require('html-webpack-plugin');
  const WebpackExtensionManifestPlugin = require("webpack-extension-manifest-plugin");
  const baseManifest = require('./src/chrome/manifest.json');
  const pkg = require('./package.json');
  // const tools = 'bootstrap-icons/icons/tools.svg';

  
  const PACKAGE_NAME = 'FoE-Info-DEV';
  process.env.NODE_ENV = 'development'

// const PUBLIC_PATH = process.env.PUBLIC_PATH || '/';

module.exports = {
  mode: 'development',
  entry: {
    // bootstrap: './src/js/bootstrap.js',
    app: './src/js/index.js',
    options: './src/js/options.js',
    devtools: './src/js/devtools.js',
    popup: './src/js/popup.js',
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './build/' + PACKAGE_NAME,
  },
    module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        // use: ["babel-loader"]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          "postcss-loader",
          'sass-loader'
        ]
      },
         {
          test: /\.(png|svg|jpg|gif)$/,
          use: [
            'file-loader'
          ]
        }
    ]
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build/' + PACKAGE_NAME),
    publicPath: '/',
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      browser: 'browser'
    }),
    new webpack.ProgressPlugin(),
    // clean the build folder
    new CleanWebpackPlugin({
      verbose: true,
      cleanStaleWebpackAssets: false,
    }),
    new webpack.DefinePlugin({
      // Definitions...
      EXT_NAME: JSON.stringify(PACKAGE_NAME),
      DEV: true
    }),
    new HtmlWebpackPlugin({
      title: PACKAGE_NAME,
      manifest: "manifest.json",
      filename: 'panel.html',
      template: "./src/chrome/panel.html",
      chunks: ['app']
    }),
    new HtmlWebpackPlugin({  
      title: PACKAGE_NAME,
      filename: 'options.html',
      template: './src/chrome/options.html',
      chunks: ['options']
    }),
    new HtmlWebpackPlugin({  
      title: PACKAGE_NAME,
      filename: 'popup.html',
      template: './src/chrome/popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({  
      title: PACKAGE_NAME,
      filename: 'devtools.html',
      template: './src/chrome/devtools.html',
      chunks: ['devtools']
    }),
    new CopyPlugin({
      patterns: [
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js', to: './'},
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js.map', to: './'},
        { from: './src/i18n', to: 'i18n' },
        { from: './src/icons/common', to: 'icons' },
        { from: './src/icons/foe-info', to: 'icons' },
        { from: 'src/images/logo90.png', to: 'icons/' }
    ]}),
    new WebpackExtensionManifestPlugin({
      config: {
        base: baseManifest,
        extend: {version: pkg.version, name: PACKAGE_NAME, short_name: PACKAGE_NAME}
      }
    })

  ],
  resolve: {
    fallback: {
      fs: false,
      // crypto: require.resolve('crypto-browserify'),
      // buffer: false,
      // stream: false
    }
  }};