const _                   = require("lodash");

const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");

class Validator {

  constructor() {
    this.logger = new Logger({ name: "validator" });
  }

  validateRepo(repo, callback) {
    this.logger.info(`Validating repo (${repo.repository})...`);

    // TODO: add validate logic

    return callback(null, repo);
  }

}

module.exports = new Validator();
