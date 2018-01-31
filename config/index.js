const path = require('path');
const getProductionConfig = require('./prod');
const getDevelopmentConfig = require('./dev');
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
