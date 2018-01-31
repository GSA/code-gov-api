const path = require('path');
const getProductionConfig = require('./prod');
const getDevelopmentConfig = require('./dev');
<<<<<<< HEAD
const jsonfile = require('jsonfile');

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

  return config;
}

module.exports = getConfig;
=======
const dotenv = require('dotenv');

let config;

if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production") {
  config = getProductionConfig();
} else {
  dotenv.config();
  config = getDevelopmentConfig();
  process.env.nrkey = config.NR_KEY;
}

config.AGENCY_ENDPOINTS_FILE = path.join(path.dirname(__dirname), config.AGENCY_ENDPOINTS_FILE);
config.REPORT_FILEPATH = path.join(path.dirname(__dirname), config.REPORT_FILEPATH);
config.DISCOVERED_DIR = path.join(path.dirname(__dirname), config.DISCOVERED_DIR);
config.FETCHED_DIR = path.join(path.dirname(__dirname), config.FETCHED_DIR);
config.DIFFED_DIR = path.join(path.dirname(__dirname), config.DIFFED_DIR);
config.FALLBACK_DIR = path.join(path.dirname(__dirname), config.FALLBACK_DIR);
config.ISSUE_TYPE_REGEXP = /\[issue-type\]/;
config.SKILL_LEVEL_REGEXP = /\[skill-level\]/;
config.EFFORT_REGEXP = /\[effort\]/;
config.IMPACT_REGEXP = /\[impact\]/;
config.FEATURED_REGEXP = /\[featured\]/;
config.GITHUB_ISSUE_STATE = 'open';
config.GITHUB_HELP_WANTED_ISSUE_LABELS = '[help wanted],[code.gov]';
config.GITHUB_AUTH_TYPE = 'token';
config.GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
module.exports = config;
>>>>>>> Added github integration config values
