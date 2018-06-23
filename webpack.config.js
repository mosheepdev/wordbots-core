const path = require('path');

const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { compact } = require('lodash');

const { NODE_ENV } = process.env;
const isProduction = NODE_ENV === 'production';

const webpackConfig = {
  devtool: isProduction ? 'source-map' : 'cheap-module-eval-source-map',
  entry: compact([
    !isProduction && 'webpack-hot-middleware/client',
    'whatwg-fetch',
    './src/client/index.js'
  ]),
  mode: isProduction ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.(t|j)sx?$/,
        include: /src/,
        exclude: /node_modules/,
        loader: ['awesome-typescript-loader?module=es6']
      },
      {
        test: /\.js$/,
        loader: 'source-map-loader',
        enforce: 'pre'
      },
      { test: /\.(png|jpg|gif|jpeg)$/, loader: 'url-loader?limit=8192'},
      { test: /\.css$/, loader: [ 'style-loader', 'css-loader' ] },
      { test: /\.(eot|svg|ttf|woff|woff2)$/, loader: 'file-loader?name=public/fonts/[name].[ext]' }
    ]
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/static/'
  },
  plugins: compact([
    !isProduction && new webpack.HotModuleReplacementPlugin(),
    new CopyWebpackPlugin([{from: 'static'}]),
    new webpack.IgnorePlugin(/canvas/),
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify(NODE_ENV) }
    })
  ]),
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  stats: isProduction ? 'minimal' : 'normal',
  target: 'web'
};

export default webpackConfig;
