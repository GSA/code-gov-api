const cfenv = require('cfenv');
const path = require('path');
const jsonfile = require('jsonfile');

function getProductionConfig(){
  const prodConfig = jsonfile.readFileSync(path.join(__dirname, 'index.json'))
  const appEnv = cfenv.getAppEnv();
  if(!appEnv.isLocal){
    const elasticSearchCredentials = appEnv.getServiceCreds("code_gov_elasticsearch");
    
    prodConfig.ES_AUTH = `${elasticSearchCredentials.username}:${elasticSearchCredentials.password}`;
    prodConfig.ES_HOST = elasticSearchCredentials.hostname;
    prodConfig.ES_PORT = elasticSearchCredentials.port;
    prodConfig.SWAGGER_HOST = appEnv.app.uris[0];
  }

  return prodConfig;
}

module.exports = getProductionConfig;
