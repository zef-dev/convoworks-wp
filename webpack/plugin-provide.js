const webpack = require('webpack');

module.exports = function () {
    return new webpack.ProvidePlugin({
    jQuery: 'jquery',
    $: 'jquery',
    'window.jQuery': 'jquery',
    'window.$': 'jquery',
})
};