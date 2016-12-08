/******************************************************************************

  VALIDATOR: a service which validates json objects, compiling an array of
  warnings for any issues which aren't dealbreakers - and throwing an error
  for any issue encountered which would break or misrepresent data in the API

******************************************************************************/

const _                   = require("lodash");
const Ajv                 = require("ajv");
const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");

const PATH_TO_SCHEMAS = "../../schemas";
const SCHEMAS = ["repo"];

class Validator {

  constructor() {
    this.logger = new Logger({ name: "validator" });

    // create ajv validators from index mappings
    let ajv = new Ajv();
    this.validators = {};
    SCHEMAS.forEach((schemaName) => {
      this.validators[schemaName] =
        ajv.compile(require(`${PATH_TO_SCHEMAS}/${schemaName}.json`));
    });
  }

  validateRepo(repo, callback) {
    this.logger.info(`Validating agency data for (${repo.agency})...`);

    let err = null;
    let result = {
      warnings: [],
      errors: []
    };

    // validate
    let valid = this.validators["repo"](repo);
    if (!valid) {
      this.logger.info(`Encountered errors when validating agency data for (${repo.agency}).`);
      let errors = this.validators["repo"].errors
      this.logger.error(errors);
      result.errors = errors;
      err = new Error("Repo Validation Error");
    } else {
      this.logger.info(`Successfully validated agency data for (${repo.agency}).`);
    }

    // TODO: add validation warnings
    let warnings = [];
    result.warnings = warnings;

    return callback(err, result);
  }

}

module.exports = new Validator();
