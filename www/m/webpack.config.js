const TerserPlugin = require("terser-webpack-plugin");
const _path_ = require('path');
const PROD_MODE = 'production';
const DEV_MODE = 'development';

const MODE = DEV_MODE;

const EXT_LIBS = './node_modules' ; // ./vendors

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
        use: []
      }/*,
      {
        test: /\.scss$/,
        use: [
          { loader: 'file-loader', options: {  name: 'bundle.css' } },
          { loader: 'extract-loader' },
          { loader: 'css-loader' },
          { loader: 'sass-loader',
            options: {
              // Prefer Dart Sass
              implementation: require('sass'),

              // See https://github.com/webpack-contrib/sass-loader/issues/804
              webpackImporter: false,
            },
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        use: []
      },*/
    ]
  },
}];
