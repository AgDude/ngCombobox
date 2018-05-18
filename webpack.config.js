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
    new webpack.BannerPlugin('Generated at ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()),
    //new webpack.optimize.UglifyJsPlugin({
    //compress: {
    //    warnings: false
    //  }
    //})
  ]
};
