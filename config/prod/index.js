const config = require('./index.json');
const cfenv = require('cfenv');
const path = require('path');

function getProductionConfig(){
  if(process.env.CLOUD_GOV){
    const appEnv = cfenv.getAppEnv();  
    const elasticSearchCredentials = appEnv.getServiceCreds("code_gov_elasticsearch");
    
    config.ES_AUTH = `${elasticSearchCredentials.username}:${elasticSearchCredentials.password}`;
    config.ES_HOST = elasticSearchCredentials.hostname;
    config.ES_PORT = elasticSearchCredentials.port;
  }

  return config;
}

module.exports = getProductionConfig;
