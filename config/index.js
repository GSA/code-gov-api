/* eslint-disable */
const cfenv = require('cfenv')
const appEnv = cfenv.getAppEnv()
const elasticSearchCredentials = appEnv.getServiceCreds("cod_gov_elasticsearch")

let config;

if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production") {
  config = require("./prod/index.json");
  config.ES_AUTH = `${elasticSearchCredentials.username}:${elasticSearchCredentials.password}`
  config.ES_HOST = elasticSearchCredentials.hostname
  config.ES_PORT = elasticSearchCredentials.port
} else {
  config = require("./dev/index.json");
  process.env.nrkey = "dont-tell-eve"
}


module.exports = config;
/* eslint-enable */
