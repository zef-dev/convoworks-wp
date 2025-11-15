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
    const buildEnv = env.ENV || 'prod';
    const isRc = buildEnv === 'rc';
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

    let devtool;
    if (isAnalyze) {
        // Inline source maps for analysis so tools like source-map-explorer can read them directly
        devtool = 'inline-source-map';
    } else if (isRc) {
        // External source maps for RC builds
        devtool = 'source-map';
    } else {
        // No source maps for regular production builds
        devtool = false;
    }

    return {
        devtool: devtool,
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
        optimization: (isAnalyze ? { ...optimization, minimize: false } : optimization),
        externals: externals,
        module: { rules },
        devServer: {
            historyApiFallback: true,
        },
        resolve: {
            fallback: {
                buffer: require.resolve('buffer/')
            }
        },
        plugins,
    };
};
