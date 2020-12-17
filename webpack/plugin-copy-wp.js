const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function () {
    return new CopyWebpackPlugin( {
        patterns : [
        { from: './common/di-*.php', to: './' },
        { from: './www/rest_admin/di-admin.php', to: './common/di-admin.php' },
        { from: './www/rest_admin/middlewares.php', to: './common/middlewares-admin.php' },
        { from: './www/rest_public/di-client.php', to: './common/di-client.php' },
        { from: './www/rest_public/middlewares.php', to: './common/middlewares-client.php' },
    ]})
};