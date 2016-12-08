/******************************************************************************

  FORMATTER: a service which formats json objects, adding new fields and mod-
  ifying existing ones as necessary for consumption by the API

******************************************************************************/

const _                   = require("lodash");
const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");

class Formatter {

  constructor() {
    this.logger = new Logger({ name: "formatter" });
  }

  formatRepo(repo, callback) {
    this.logger.info(`Formatting repo (${repo.repository})...`);

    // add repoId using a combination of agency, organization, and repository
    // url fields
    let repoId = Utils.transformStringToKey([
      repo.agency,
      repo.organization,
      repo.repository
    ].join("_"));
    repo["repoID"] = repoId;

    // TODO: error handling
    return callback(null, repo);
  }

}

module.exports = new Formatter();
