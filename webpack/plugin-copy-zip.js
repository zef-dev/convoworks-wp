const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function ( configFilename) {
    return new CopyWebpackPlugin( {
        patterns : [
//        { from: './app/convoworks/editor/config/images/*.png', to: './assets/img/', flatten: true },
        { from: './library/**/*', to:"../", globOptions: {
            ignore: ['**/library/docs/**', '**/composer*'],
          }},
        { from: './www/rest_admin/**/*', to: "../", globOptions: {
            dot: true,
            ignore: ['**/*.gitignore']
          }},
        { from: './www/rest_public/**/*', to: "../", globOptions: {
            dot: true,
            ignore: ['**/*.gitignore']
          }},
        { from: './common/'+configFilename, to: "../common/__config.example.php"},
        { from: './common/di-*.php', to: "../"},
        { from: './data-zip/', to: "../data/"},
        { from: './log/', to: "../log/", globOptions: {
            dot: true,
            ignore: ['**/*.log']
          }},
        { from: './README-ZIP.md', to: '../README.md' },
        { from: './CHANGELOG.md', to: '../CHANGELOG.md' },
    ]})
};
