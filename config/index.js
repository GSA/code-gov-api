const path = require('path');
const getProductionConfig = require('./prod');
const getDevelopmentConfig = require('./dev');
const jsonfile = require('jsonfile');
const dotenv = require('dotenv');

function getConfig(env) {
  let config = {
    prod_envs: ['prod', 'production', 'stag', 'staging']
  };
  if (config.prod_envs.includes(env)) {
    config = Object.assign(config, getProductionConfig());
    config.LOGGER_LEVEL = 'INFO';
  } else {
    config = Object.assign(config, getDevelopmentConfig());
    config.LOGGER_LEVEL = 'DEBUG';
    dotenv.config();
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
  config.issueTypeRegEx = /\[issue-type\]/;
  config.skillLevelRegEx = /\[skill-level\]/;
  config.effortRegEx = /\[effort\]/;
  config.impactRegEx = /\[impact\]/;
  config.featuredRegEx = /\[featured\]/;
  config.GITHUB_ISSUE_STATE = 'open';
  config.GITHUB_HELP_WANTED_ISSUE_LABELS = 'help wanted';
  config.GITHUB_AUTH_TYPE = 'token';
  config.GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

  return config;
}

module.exports = getConfig;
