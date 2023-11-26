var webpack = require("webpack"),
  path = require("path"),
  fileSystem = require("fs");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackExtensionManifestPlugin = require("webpack-extension-manifest-plugin");
const baseManifest = require("./src/chrome/manifest_release.json");
const pkg = require("./package.json");
const TerserPlugin = require("terser-webpack-plugin");
var ZipPlugin = require("zip-webpack-plugin");
// const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
const PACKAGE_NAME = "FoE-Info";
const date = new Date().toISOString().substr(0, 10);

// const PUBLIC_PATH = process.env.PUBLIC_PATH || '/';

module.exports = {
  mode: "production",
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 6,
          parse: {},
          compress: {
            pure_funcs: ["console.info", "console.debug"],
          },
          format: {
            comments: false,
          },
          mangle: true,
          module: true,
          // Deprecated
          output: null,
          format: null,
          toplevel: false,
          nameCache: null,
          ie8: false,
          keep_classnames: false,
          keep_fnames: false,
          safari10: false,
        },
        extractComments: false,
      }),
    ],
  },
  entry: {
    app: "./src/js/index.js",
    options: "./src/js/options.js",
    devtools: "./src/js/devtools.js",
    popup: "./src/js/popup.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        // use: ["babel-loader"]
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"],
      },
    ],
  },
  output: {
    filename: "[name].js",
    chunkFilename: "[name].js",
    path: path.resolve(__dirname, "build/" + PACKAGE_NAME + "_WEBSTORE"),
    publicPath: "/",
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
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
      WEBSTORE: true,
      DEV: false,
    }),
    new HtmlWebpackPlugin({
      title: PACKAGE_NAME,
      meta: {
        charset: "utf-8",
        viewport: "width=device-width, initial-scale=1, shrink-to-fit=no",
        "theme-color": "#000000",
      },
      manifest: "manifest.json",
      filename: "panel.html",
      template: "./src/chrome/panel.html",
      chunks: ["app"],
      hash: true,
    }),
    new HtmlWebpackPlugin({
      title: PACKAGE_NAME,
      filename: "options.html",
      template: "./src/chrome/options.html",
      chunks: ["options"],
    }),
    new HtmlWebpackPlugin({
      title: PACKAGE_NAME,
      filename: "popup.html",
      template: "./src/chrome/popup.html",
      chunks: ["popup"],
    }),
    new HtmlWebpackPlugin({
      title: PACKAGE_NAME,
      filename: "devtools.html",
      template: "./src/chrome/devtools.html",
      chunks: ["devtools"],
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/webextension-polyfill/dist/browser-polyfill.js",
        },
      ],
    }),
    new CopyPlugin({
      patterns: [{ from: "./src/i18n", to: "i18n" }],
    }),
    new CopyPlugin({
      patterns: [{ from: "./src/icons/common", to: "icons" }],
    }),
    new CopyPlugin({
      patterns: [{ from: "./src/icons/foe-info", to: "icons" }],
    }),
    new CopyPlugin({
      patterns: [{ from: "src/images/logo90.png", to: "icons/" }],
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
      // OPTIONAL: defaults to the Webpack output path (above)
      // can be relative (to Webpack output path) or absolute
      path: "../",

      // OPTIONAL: defaults to the Webpack output filename (above) or,
      // if not present, the basename of the path
      filename: PACKAGE_NAME + "_WEBSTORE" + "_" + pkg.version + "_" + date + ".zip",
    }),
  ],
  resolve: {
    fallback: {
      fs: false,
    },
  },
};
