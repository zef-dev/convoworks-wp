const path = require('path');

var pluginProvide = require('./webpack/plugin-provide');
var optimization = require('./webpack/optimization');
var rules = require('./webpack/module-rules');
var externals = require('./webpack/externals');

const gracefulFs = require('graceful-fs');
const fs = require('fs');
gracefulFs.gracefulify(fs);

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = function (env) {

    const plugins = [
        pluginProvide(),
    ];

    if (env && env.analyze) {
        plugins.push(
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                openAnalyzer: false,
                reportFilename: 'report-chat.html',
            })
        );
    }

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
        },
        plugins,
    };
};
