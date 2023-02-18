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
        include: [
          path.resolve(__dirname, "src"),
        ],
        use: [
          {
            loader: 'ts-loader',
            options: {
              happyPackMode: true
            }
          }
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
  },
  output: {
    clean: true,
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    symlinks: false,
    fallback: { "querystring": false }
  },
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000,
  },
}

function exportServer(name, ...other) {
  return merge(exportDefaults, {
    name: name + "_server",
    output: {
      filename: 'server.js',
      publicPath: "/" + name + "/",
      path: path.resolve(__dirname, 'dist/server/' + name),// Separate server from client, see below.
    },
    experiments: {
      futureDefaults: true,
    },
    target: 'node',
    entry: `./src/${name}/server.ts`,
  }, ...other);
}

function exportClient(name, ...other) {
  return merge(exportDefaults, {
    name: name + "_client",
    output: {
      filename: 'client.js',
      path: path.resolve(__dirname, 'dist/client/' + name),// Separate client from server to serve whole folder.
      publicPath: "/" + name + "/", // Where files are served from.
      clean: false,
    },
    experiments: {
      futureDefaults: true,
    },
    entry: `./src/${name}/client.ts`,
    target: 'web',
    plugins: [
      new HtmlWebpackPlugin({// Create html from template.
        template: `src/${name}/index.ejs`,
        filename: 'index.html',
        minify: true,
      }),
      new CopyWebpackPlugin({// Copy assets to new folder.
        patterns: [
          { from: `src/${name}/assets`, to: "assets/" }
        ]
      }),
    ]
  }, ...other);
}

module.exports = [
  exportClient('test_game'),
  exportServer('main', {
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: "src/main/index.ejs", to: "./" }
        ]
      }),
    ],
    externals: [nodeExternals()],
  }),
]