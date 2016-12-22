/******************************************************************************

  VALIDATOR: a service which validates json objects, compiling an array of
  warnings for any issues which aren't dealbreakers - and throwing an error
  for any issue encountered which would break or misrepresent data in the API

******************************************************************************/

const _                   = require("lodash");
const async               = require("async");
const Ajv                 = require("ajv");
const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");

const PATH_TO_SCHEMAS = "../../schemas";
const SCHEMAS = ["repo"];

class Validator {

  constructor() {
    this.logger = new Logger({ name: "validator" });

    // create ajv validators from index mappings
    let ajv = new Ajv({ async: true });
    this.validators = {};
    SCHEMAS.forEach((schemaName) => {
      let pathToSchemas = `${PATH_TO_SCHEMAS}/${schemaName}`;
      this.validators[schemaName] = {
        relaxed: ajv.compile(require(`${pathToSchemas}/relaxed.json`)),
        strict: ajv.compile(require(`${pathToSchemas}/strict.json`))
      }
    });
  }

  _validateRepoRelaxed(repo, callback) {
    // validate for errors
    let valid = this.validators["repo"]["relaxed"](repo);
    if (valid) {
      this.logger.info(`Successfully validated repo data for ${repo.name} (${repo.repoID}).`);
      callback(null, []);
    } else {
      this.logger.info(`Encountered errors when validating repo data for ${repo.name} (${repo.repoID}).`);
      let errors = this.validators["repo"]["relaxed"].errors;
      this.logger.error(errors);
      callback(null, errors);
    }
  }

  _validateRepoStrict(repo, callback) {
    // validate for warnings
    let valid = this.validators["repo"]["strict"](repo);
    if (valid) {
      // this.logger.info(`Didn't find any warnings for ${repo.name} (${repo.repoID}).`);
      callback(null, []);
    } else {
      this.logger.info(`Encountered warnings when validating repo data for ${repo.name} (${repo.repoID}).`);
      let warnings = this.validators["repo"]["strict"].errors;
      this.logger.warning(warnings);
      callback(null, warnings);
    }
  }

  validateRepo(repo, callback) {
    this.logger.info(`Validating repo data for ${repo.name} (${repo.repoID})...`);

    let result = {
      "repoID": repo.repoID,
      "agency": repo.agency.name,
      "organization": repo.organization,
      "project_name": repo.name,
      issues: {
        warnings: [],
        errors: []
      }
    };

    async.waterfall([
      (next) => {
        this._validateRepoRelaxed(repo, next);
      },
      (validationErrors, next) => {
        result.issues.errors = validationErrors;
        this._validateRepoStrict(repo, next);
      },
      (validationWarnings, next) => {
        // remove errors from warnings
        let warnings = Utils.removeDupes(validationWarnings, result.issues.errors);
        result.issues.warnings = warnings;

        // TODO: remove fields which have warnings from the repo object
        // (possibly necessary to avoid indexing issues)

        next();
      }
    ], (err) => {
      if (err) {
        // this.logger.error(err);
      } else {
        // check to see if we encountered any validation errors
        if (result.issues.errors.length) {
          // if we encountered any, make a new error to return in the callback
          err = new Error(
            `Encountered ${result.issues.errors.length} validation errors.`
          );
        }
      }
      // NOTE: need to buffer because ajs' promises don't work
      setTimeout(() => { callback(err, result); }, 10);
      // return callback(err, result);
    });
  }

}

module.exports = new Validator();
