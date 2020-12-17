const packageJson = require('../package.json');

module.exports = function ( ENV) {

    var config = require('../env/' + ENV + '.json');

    for (var i in config['consts']) {
        config['consts'][i] = JSON.stringify(config['consts'][i]);
    }
    config['ENV_VERSION']   =   packageJson.version;

    return config
};
