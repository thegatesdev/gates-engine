const path = require('path');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');

const exportDefaults = {
  mode: 'development',
  context: __dirname, // to automatically find tsconfig.json
  devtool: 'inline-source-map',// Include source maps in output
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: [
          /node_modules/,/BASE_CODE/
        ]
      },
    ],
  },
  output: {
    clean: true,
    // publicPath option is only if webpack is deployed on the client.
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
}

const exportServer = {
  name: 'server',
  target: 'node',
  externals: [nodeExternals()],
  stats: {
    errorDetails: true,
  },
  entry: './src/server/server.ts',
  output: {
    filename: 'server.js',
    path: path.resolve(__dirname, 'dist/server'),
  },
}

const exportTestGame = {
  name: 'test_game',
  entry: {
    client: './src/test_game/client.ts',
    server: './src/test_game/server.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/test_game'),
    publicPath: "/"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/test_game/index.ejs',
      filename: 'index.html',
      minify: true,
      chunks: ['client'],
    }),
    new CopyWebpackPlugin({
      patterns: [
          { from: "src/test_game/assets", to: "assets/" }
      ]
    }),
  ],
  experiments: {
    futureDefaults: true,
  },
}

module.exports = [
  merge(exportDefaults, exportServer),
  merge(exportDefaults, exportTestGame),
]