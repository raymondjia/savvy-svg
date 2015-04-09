
var _ = require('lodash');

var mainConfig = {
    projects: [],              // do not add projects here, use the 'config_local.js' instead 
};

try {
    var localConfig = require('./config_local');
    if (localConfig) _.merge(mainConfig, localConfig);
} catch (e) {
}

module.exports = mainConfig;
