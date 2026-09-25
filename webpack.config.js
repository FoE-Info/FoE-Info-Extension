const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const common = require('./webpack.common.js');
const pkg = require('./package.json');

module.exports = (env = {}, argv = {}) => {
  const target = env.target || (argv.mode === 'production' ? 'prod' : 'dev');

  let outputDir;
  let extName;
  let isDev = false;
  let isWebstore = false;
  let isBeta = false;

  if (target === 'dev') {
    outputDir = path.resolve(__dirname, 'build/FoE-Info-DEV');
    extName = 'FoE-Info (DEV)';
    isDev = true;
  } else if (target === 'beta') {
    outputDir = path.resolve(__dirname, 'build/FoE-Info-Beta');
    extName = 'FoE-Info (BETA)';
    isBeta = true;
  } else {
    // prod
    outputDir = path.resolve(__dirname, 'build/FoE-Info-Prod');
    extName = 'FoE-Info';
    isWebstore = true;
  }

  const manifestTransform = (content) => {
    const manifest = JSON.parse(content.toString());
    manifest.version = pkg.version;
    if (target === 'dev') {
      manifest.name = 'FoE-Info (DEV)';
      manifest.short_name = 'FoE-Info (DEV)';
    } else if (target === 'beta') {
      manifest.name = 'FoE-Info (BETA)';
      manifest.short_name = 'FoE-Info (BETA)';
    } else {
      manifest.name = 'FoE-Info';
      manifest.short_name = 'FoE-Info';
    }
    return JSON.stringify(manifest, null, 2);
  };

  const isProdMode = target === 'prod' || target === 'beta';
  const isDebugBuild = target === 'dev' || target === 'beta';
  const forceFixtures = false;

  const config = {
    mode: isProdMode ? 'production' : 'development',
    devtool: isProdMode ? 'source-map' : 'cheap-module-source-map',
    cache: isProdMode ? false : { type: 'filesystem' },
    // Keep build output to errors and warnings. The asset/module table is
    // unnecessary noise; use `--stats detailed` when you need the breakdown.
    stats: 'errors-warnings',
    // webpack-cli v7 turns the progress plugin on by default and routes it
    // through the infrastructure logger, which spams one line per build step.
    infrastructureLogging: { level: 'error' },
    output: {
      path: outputDir,
    },
    module: {
      rules: [
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                sassOptions: {
                  quietDeps: true,
                  silenceDeprecations: [
                    'color-functions',
                    'global-builtin',
                    'import',
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new webpack.DefinePlugin({
        EXT_NAME: JSON.stringify(extName),
        DEV: isDev,
        WEBSTORE: isWebstore,
        BETA: isBeta,
        DEBUG_BUILD: isDebugBuild,
        FORCE_FIXTURES: forceFixtures,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: './src/chrome/manifest.json',
            to: 'manifest.json',
            transform: manifestTransform,
          },
        ],
      }),
    ],
  };

  if (isProdMode) {
    config.optimization = {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            ecma: 2020,
            compress: {
              drop_console: false,
              pure_funcs: [],
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
      ],
    };
  }

  return merge(common, config);
};
