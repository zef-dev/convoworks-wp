const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function ( configFilename) {
    return new CopyWebpackPlugin( {
        patterns : [
        { from: './app/proto/nav/Convoworks_color_RGB.png', to: './assets/img/Convoworks_color_RGB.png' },
//        { from: './app/convoworks/images/Convoworks_Logo_White.png', to: './assets/img/Convoworks_Logo_White.png' },
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
        { from: './common/'+configFilename, to: "../common/__config.php"},
        { from: './common/di-*.php', to: "../"},
    ]})
};
