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

    env = env || {};
    const isAnalyze = !!env.analyze;

    const plugins = [
        //pluginCopy(),
        pluginProvide(),
//            pluginHtml(config, './app/index.ejs', 'index.php'),
    ];

    if (isAnalyze) {
        plugins.push(
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                openAnalyzer: false,
                reportFilename: 'report-admin.html',
            })
        );
    }

    return {
        devtool: 'eval-cheap-module-source-map',
        mode: 'production',
        entry: {
            main: path.resolve('app/', 'app.js'),
        },
        output: {
            path: path.resolve(__dirname, 'public/assets/js'),
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
        plugins,
    };
};
