const path = require('path');

var pluginProvide = require('./webpack/plugin-provide');
var optimization = require('./webpack/optimization');
var rules = require('./webpack/module-rules');
var externals = require('./webpack/externals');

const gracefulFs = require('graceful-fs');
const fs = require('fs');
gracefulFs.gracefulify(fs);

module.exports = function (env) {


    return {
        devtool: 'eval-cheap-module-source-map',
        mode: 'production',
        entry: {
            main: path.resolve('chat/', 'index.js'),
        },
        output: {
            path: path.resolve(__dirname, 'public/assets/chat/js'),
            publicPath: '/',
            filename: '[name].js',
            chunkFilename: '[name].js',
        },
        optimization: optimization,
        externals: externals,
        module: { rules },
        devServer: {
            historyApiFallback: true,
        },
        resolve: {
            alias: {
                'jquery-ui': 'jquery-ui-dist/jquery-ui.js'
            }
        },
        plugins: [
            pluginProvide(),
        ],
    };
};
