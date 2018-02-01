const path = require('path');
const getProductionConfig = require('./prod');
const getDevelopmentConfig = require('./dev');
let config;

config.prod_envs = ['prod', 'production', 'stag', 'staging'];

if (config.prod_envs.includes(process.env.NODE_ENV)) {
  config = getProductionConfig();
} else {
  config = getDevelopmentConfig();
}

config.AGENCY_ENDPOINTS_FILE = path.join(path.dirname(__dirname), config.AGENCY_ENDPOINTS_FILE);
config.REPORT_FILEPATH = path.join(path.dirname(__dirname), config.REPORT_FILEPATH);
config.DISCOVERED_DIR = path.join(path.dirname(__dirname), config.DISCOVERED_DIR);
config.FETCHED_DIR = path.join(path.dirname(__dirname), config.FETCHED_DIR);
config.DIFFED_DIR = path.join(path.dirname(__dirname), config.DIFFED_DIR);
config.FALLBACK_DIR = path.join(path.dirname(__dirname), config.FALLBACK_DIR);

module.exports = config;
