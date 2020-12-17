const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = function() {
    return new UglifyJsPlugin({
        parallel: true,
        uglifyOptions: {
            comments: false,
            // compress: {
            //     // Drop only console.logs but leave others
            //     pure_funcs: [
            //         '$log.log',     '$log.warn',    '$log.error',
            //         'console.log',  'console.warn', 'console.error'
            //     ],
            // },
        }
    });
};
