'use strict';

import type { Configuration } from '@rspack/core';
const rspack = require('@rspack/core');
const path = require('path');

const extensionConfig: Configuration = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    // clean: true,
  },
  externals: {
    sharp: 'commonjs sharp',
    vscode: 'commonjs vscode',
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
};

const newConfig: Configuration = {
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
            plugins: ['solid-refresh/babel'],
          },
        },
      },
    ],
  },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'webview-ui/index.html', to: 'index.html' },
        { from: 'webview-ui/main.css', to: 'main.css' },
      ],
    }),
  ],
};

module.exports = [extensionConfig, newConfig];
