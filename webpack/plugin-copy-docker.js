const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function ( configFilename) {
    return new CopyWebpackPlugin( {
        patterns : [
        { from: './app/**/*', to: '../' },
        { from: './library/**/*', to: '../', globOptions: {
            ignore: ['**/library/docs/**', '**/library/vendor/**'],
        }},
        { from: './www/login/**/*', to: '../'},
        { from: './www/rest_public/**/*', to: '../'},
        { from: './www/rest_admin/**/*', to: '../'},
        { from: './docker/**/*', to: '../' },
        { from: './env/dev.json', to: '../env/dev.json' },
        { from: './webpack/**/*', to: '../', globOptions: {
            ignore: ['**/plugin-copy-docker.js', '**/plugin-copy-wp.js', '**/plugin-copy-zip.js']
        } },
        { from: './common/__config.example.php', to: '../common/__config.example.php' },
        { from: './common/di-*.php', to: '../'},
        { from: './data-zip/', to: "../data/"},
        { from: './docker-compose.yml', to: '../docker-compose.yml' },
        { from: './log/', to: "../log/", globOptions: {
            dot: true,
            ignore: ['**/*.log']
        }},
        { from: './README-DOCKER.md', to: '../README.md' },
        { from: './CHANGELOG.md', to: '../CHANGELOG.md' },
        { from: './webpack.config.js', to: '../webpack.config.js' },
        { from: './package.json', to: '../package.json' },
        { from: './.babelrc', to: '../', globOptions: {
            dot: true,
        }},
    ]})
};
