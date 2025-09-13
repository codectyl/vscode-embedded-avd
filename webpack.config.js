//@ts-check

'use strict';

const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const { HotModuleReplacementPlugin } = require('webpack');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
  },
  externals: {
    sharp: 'commonjs sharp',
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
};

/** @type WebpackConfig */
const newConfig = {
  entry: './webview-ui/src/index.tsx',
  output: {
    filename: 'main.js', // compiled JS
    path: path.resolve(__dirname, 'dist/webview-ui'),
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            presets: ['@babel/preset-env', 'solid', '@babel/preset-typescript'],
            plugins: ['solid-refresh/babel', {bundler: 'webpack5'}],
          },
        },
      },
    ],
  },
  plugins: [
    new HotModuleReplacementPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'webview-ui/index.html', to: 'index.html' },
        { from: 'webview-ui/main.css', to: 'main.css' },
      ],
    }),
  ],
};

module.exports = (_, argv) => {
  if (argv.mode === 'production') {
    extensionConfig.mode = 'production';
    newConfig.mode = 'production';
  } else {
    extensionConfig.mode = 'development';
    newConfig.mode = 'development';
  }
  return [extensionConfig, newConfig];
};
