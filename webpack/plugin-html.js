var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function ( config, template, filename) {
    var htmlPluginOptions   =   {
        inject: false,
        hash: true,
        template: template,
        filename: filename,
        minify: false
    };

    htmlPluginOptions = { ...htmlPluginOptions, ...config };
    return new HtmlWebpackPlugin( htmlPluginOptions)
};