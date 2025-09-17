'use strict';

import type { Configuration } from '@rspack/core';
import rspack from '@rspack/core';
import path from 'path';
import fs from 'fs/promises';

const extensionConfig: Configuration = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
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
    // Should be in sync with the scriptUri in webviewManager.ts
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist', 'webview-ui'),
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        test: /\.worker\.ts$/,
        include: path.resolve(__dirname, 'src/web-worker'),
        use: 'worker-rspack-loader',
      },
      {
        test: /\.(ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            presets: ['@babel/preset-env', 'solid', '@babel/preset-typescript'],
            plugins: ['solid-refresh/babel', 'solid-styled-jsx/babel'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          rspack.CssExtractRspackPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
        type: 'javascript/auto',
      },
    ],
  },
  experiments: {
    css: false,
  },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'webview-ui/index.html', to: 'index.html' }, // Should be in sync with the htmlPath in webviewManager.ts
      ],
    }),
    new rspack.CssExtractRspackPlugin({
      filename: 'css/main.css', // Should be in sync with the stylesUri in webviewManager.ts
    }),
  ],
};

export default async () => {
  // Clean the output directory before each run to avoid using previous builds
  await fs.rm('dist', { recursive: true, force: true });
  return [extensionConfig, newConfig];
};
