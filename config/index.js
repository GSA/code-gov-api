const cfenv = require('cfenv');
const path = require('path');
const dotenv = require('dotenv');
const jsonfile = require('jsonfile');

function getCloudFoundryEnv() {
  const appEnv = cfenv.getAppEnv();
  if(!appEnv.isLocal){
    const elasticSearchCredentials = appEnv.getServiceCreds("code_gov_elasticsearch");

    return {
      esAuth: `${elasticSearchCredentials.username}:${elasticSearchCredentials.password}`,
      esHost: elasticSearchCredentials.hostname,
      esPort: elasticSearchCredentials.port,
      spaceName: appEnv.app.space_name,
      uris: appEnv.app.uris
    };
  }
  return {};
}

function getAppFilesDirectories() {
  return {
    AGENCY_ENDPOINTS_FILE: path.join(path.dirname(__dirname), 'config/agency_metadata.json'),
    REPORT_FILEPATH: path.join(path.dirname(__dirname), "/data/status/report.json"),
    DISCOVERED_DIR: path.join(path.dirname(__dirname), "/data/discovered"),
    FETCHED_DIR: path.join(path.dirname(__dirname), "/data/fetched"),
    DIFFED_DIR: path.join(path.dirname(__dirname), "/data/diffed"),
    FALLBACK_DIR: path.join(path.dirname(__dirname), "/data/fallback")
  };
}

function getSwaggerConf(spaceName, uri, port) {
  const SWAGGER_HOST = process.env.SWAGGER_HOST || spaceName === 'prod'
    ? 'api.code.gov'
    : uri;
  const SWAGGER_ENV = process.env.SWAGGER_ENV || spaceName;

  const SWAGGER_DOCUMENT = SWAGGER_ENV === 'prod'
    ? jsonfile.readFileSync(path.join(path.dirname(__dirname), './swagger-prod.json'))
    : jsonfile.readFileSync(path.join(path.dirname(__dirname), './swagger.json'));
  SWAGGER_DOCUMENT.host = SWAGGER_HOST || `0.0.0.0:${port}`;
}

function getConfig(env) {
  let config = {
    prod_envs: ['prod', 'production', 'stag', 'staging']
  };

  dotenv.config(path.join(path.dirname(__dirname), '.env'));

  const isProd = config.prod_envs.includes(env);

  config.LOGGER_LEVEL = process.env.LOGGER_LEVEL || isProd ? 'INFO' : 'DEBUG';
  config.USE_HSTS = process.env.USE_HSTS || isProd ? true : false;
  config.HSTS_MAX_AGE = process.env.HSTS_MAX_AGE || 31536000;
  config.HSTS_PRELOAD = process.env.HSTS_PRELOAD || false;
  config.PORT = process.env.PORT || 3001;

  const cfElasticsearch = getCloudFoundryEnv();

  config.ES_AUTH = `${process.env.ES_USER}:${process.env.ES_PASSWORD}` || cfElasticsearch.esAuth || 'root';
  config.ES_HOST = process.env.ES_HOST || cfElasticsearch.esHost || 'localhost';
  config.ES_PORT = process.env.ES_PORT || cfElasticsearch.esPort || 9200;

  Object.assign(config, getAppFilesDirectories());
  Object.assign(config, getSwaggerConf(cfElasticsearch.spaceName, cfElasticsearch.uri, config.PORT));

  return config;
}

module.exports = getConfig;
