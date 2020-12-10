var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'react-lab': './src/react-lab.tsx'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: "[name].js",
    library: 'ReactLab',
    libraryTarget: 'umd'
  },
  optimization: {
    // Leave minimization up to the client app.
    minimize: false
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.tsx', '.js' ]
  },
  externals: {
    'react': {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react'
    },
    'react-dom': {
      root: 'ReactDOM',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      amd: 'react-dom'
    }
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {from: 'lab', to: 'lab'}
      ]
    })
  ]
};
