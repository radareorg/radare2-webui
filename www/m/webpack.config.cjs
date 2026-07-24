const TerserPlugin = require("terser-webpack-plugin");
const _path_ = require('path');

const MODE = 'development';

module.exports = [{
  entry: {
    main: './js/app.js'
  },
  mode: MODE,
  output: {
    path: _path_.resolve(__dirname, 'dist'),
    filename: 'main.min.js',
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
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
