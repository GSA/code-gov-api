const path = require('path');
const getProductionConfig = require('./prod');
const getDevelopmentConfig = require('./dev');
let config;

if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production") {
  config = getProductionConfig();
} else {
  config = getDevelopmentConfig();
  process.env.nrkey = config.NR_KEY;
}

config.AGENCY_ENDPOINTS_FILE = path.join(path.dirname(__dirname), config.AGENCY_ENDPOINTS_FILE);
config.REPORT_FILEPATH = path.join(path.dirname(__dirname), config.REPORT_FILEPATH);
config.DISCOVERED_DIR = path.join(path.dirname(__dirname), config.DISCOVERED_DIR);
config.FETCHED_DIR = path.join(path.dirname(__dirname), config.FETCHED_DIR);
config.DIFFED_DIR = path.join(path.dirname(__dirname), config.DIFFED_DIR);
config.FALLBACK_DIR = path.join(path.dirname(__dirname), config.FALLBACK_DIR);
config.issueTypeRegEx = /\[issue-type\]/;
config.skillLevelRegEx = /\[skill-level\]/;
config.effortRegEx = /\[effort\]/;
config.impactRegEx = /\[impact\]/;
config.featuredRegEx = /\[featured\]/;

module.exports = config;
