const jsonfile = require('jsonfile');
const path = require('path');

function getDevelopmentConfig() {
  return jsonfile.readFileSync(path.join(__dirname, 'index.json'));
}

module.exports = getDevelopmentConfig;
