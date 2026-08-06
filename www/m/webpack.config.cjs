const TerserPlugin = require("terser-webpack-plugin");
const _path_ = require('path');

module.exports = [{
  entry: {
    main: './js/app.js'
  },
  mode: 'production',
  devtool: false,
  output: {
    path: _path_.resolve(__dirname, 'dist'),
    filename: 'main.min.js',
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      extractComments: false,
      terserOptions: {
        compress: { passes: 3 },
        format: { comments: false },
      },
    })],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        resolve: {
          fullySpecified: false,
        },
        use: []
      }
    ]
  },
}];
