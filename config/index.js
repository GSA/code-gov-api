const path = require('path');
const getProductionConfig = require('./prod');
const getDevelopmentConfig = require('./dev');
const jsonfile = require('jsonfile');

function getConfig(env) {
  let config = {
    prod_envs: ['prod', 'production', 'stag', 'staging']
  };
  if (config.prod_envs.includes(env)) {
    config = Object.assign(config, getProductionConfig());
    config.LOGGER_LEVEL = 'INFO'
  } else {
    config = Object.assign(config, getDevelopmentConfig());
    config.LOGGER_LEVEL = 'DEBUG'
  }

  config.AGENCY_ENDPOINTS_FILE = path.join(path.dirname(__dirname), 'config/agency_metadata.json');
  config.REPORT_FILEPATH = path.join(path.dirname(__dirname), config.REPORT_FILEPATH);
  config.DISCOVERED_DIR = path.join(path.dirname(__dirname), config.DISCOVERED_DIR);
  config.FETCHED_DIR = path.join(path.dirname(__dirname), config.FETCHED_DIR);
  config.DIFFED_DIR = path.join(path.dirname(__dirname), config.DIFFED_DIR);
  config.FALLBACK_DIR = path.join(path.dirname(__dirname), config.FALLBACK_DIR);
  config.PORT = process.env.PORT || 3001;
  config.SWAGGER_DOCUMENT = config.SWAGGER_ENV === 'prod'
    ? jsonfile.readFileSync(path.join(path.dirname(__dirname), './swagger-prod.json'))
    : jsonfile.readFileSync(path.join(path.dirname(__dirname), './swagger.json'));
  config.SWAGGER_DOCUMENT.host = config.SWAGGER_HOST || `0.0.0.0:${config.PORT}`;
  return config;
}

module.exports = getConfig;
