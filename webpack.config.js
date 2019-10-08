var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.PRODUCTION ? 'production' : 'development',
  entry: {
    'react-lab': './js/lab.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: "[name].js",
    library: 'ReactLab',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      }
    ]
  },
  externals: [
    {
      'react': {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      }
    },
    {
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom'
      }
    }
  ],
  plugins: [
    new CopyWebpackPlugin([
      {from: 'lab', to: 'lab'}
    ])
  ]
};
