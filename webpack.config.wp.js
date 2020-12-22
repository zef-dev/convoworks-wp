const path = require('path');

var pluginProvide = require('./webpack/plugin-provide');
var pluginCopy = require('./webpack/plugin-copy-wp');
var pluginHtml = require('./webpack/plugin-html');
var loadEnv = require('./webpack/load-env');
var optimization = require('./webpack/optimization');
var rules = require('./webpack/module-rules');
var externals = require('./webpack/externals');

module.exports = function ( env) {
    
    var config  =   loadEnv( env.ENV);

    return {
        devtool: 'cheap-module-eval-source-map',
        mode: 'production',
        entry: {
            main: path.resolve('app/', 'app.js'),
        },
        output: {
            path: path.resolve(__dirname, 'dist/www'),
                publicPath: '/',
                filename: '[name].js',
                chunkFilename: '[name].js',
        },
        optimization: optimization,
        externals: externals,
        module: {
            rules: rules,
        },
        devServer: {
            historyApiFallback: true,
        },
        resolve: {
            alias: {
                'jquery-ui': 'jquery-ui-dist/jquery-ui.js'
            }
        },
        plugins: [
            //pluginCopy(),
            pluginProvide(),
            pluginHtml( config, './app/index.ejs', 'index.php'),
        ],
    };
};
