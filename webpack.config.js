var webpack = require('webpack');
var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');

module.exports = {
  entry:  './src/init.js',
  output: {
    path:     'build',
    filename: 'ng-combobox.js',
  },
  plugins: [
    new ngAnnotatePlugin({
        add: true,
    }),
    //new webpack.optimize.UglifyJsPlugin({
    //compress: {
    //    warnings: false
    //  }
    //})
  ]
};
