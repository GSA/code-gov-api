/******************************************************************************

  VALIDATOR: a service which validates json objects, compiling an array of
  warnings for any issues which aren't dealbreakers - and throwing an error
  for any issue encountered which would break or misrepresent data in the API

******************************************************************************/

const async = require("async");
const Ajv = require("ajv");
const Utils = require("../../utils");
const Logger = require("../../utils/logger");
const path = require('path');
const JsonFile = require('jsonfile');
const version4Schema = require('ajv/lib/refs/json-schema-draft-04.json');

const PATH_TO_SCHEMAS = path.join(process.cwd(), '/schemas');
const SCHEMAS = ["repo"];
const logger = new Logger({ name: "validator" });

/**
 * Return validator for specified schema indicated in the version field found in the codeJson.
 * @param {object} codeJson 
 */
function getValidator(codeJson) {
  const version = Utils.getCodeJsonVersion(codeJson);
  return new Validator(version);
}

/**
 * Get schema validator functions for a given schema path.
 * @param {string} schemaPath 
 */
function getSchemaValidators(schemaPath) {
  const ajv = new Ajv({ async: true, allErrors: true });
  ajv.addMetaSchema(version4Schema);

  return { 
    relaxed: ajv.compile(JsonFile.readFileSync(path.join(schemaPath, '/relaxed.json'))), 
    strict: ajv.compile(JsonFile.readFileSync(path.join(schemaPath, '/strict.json'))), 
    enhanced: ajv.compile(JsonFile.readFileSync(path.join(schemaPath, '/enhanced.json')))
  };
}

function getCleaner(schemaPath) {
  const ajv = new Ajv({ removeAdditional: true });
  ajv.addMetaSchema(version4Schema);

  return ajv.compile(JsonFile.readFileSync(path.join(schemaPath, '/strict.json')));
}

class Validator {

  constructor(version) {
    this._version = version;
    this.validators = {};

    SCHEMAS.forEach((schemaName) => {
      const pathToSchemas = path.join(PATH_TO_SCHEMAS, schemaName, this._version);
      this.validators[schemaName] = getSchemaValidators(pathToSchemas);
    });
    this.cleaner = getCleaner(path.join(PATH_TO_SCHEMAS, 'repo', this._version));
  }

  /**
   * Validate the passed repo with a relaxed json schema.
   * @param {object} repo 
   * @param {object} callback 
   */
  _validateRepoRelaxed(repo, callback) {
    // validate for errors
    let valid = this.validators["repo"]["relaxed"](repo);
    if (valid) {
      logger.debug(`Successfully validated repo data for ${repo.name} (${repo.repoID}).`);
      callback(null, []);
    } else {
      logger.debug(`Encountered errors when validating repo data for ${repo.name} (${repo.repoID}).`);
      let errors = this.validators["repo"]["relaxed"].errors;
      logger.debug(errors);
      callback(null, errors);
    }
  }

  /**
   * Validate the passed repo with a strict json schema.
   * @param {object} repo 
   * @param {object} callback 
   */
  _validateRepoStrict(repo, callback) {
    // validate for warnings
    let valid = this.validators["repo"]["strict"](repo);
    if (valid) {
      // logger.info(`Didn't find any warnings for ${repo.name} (${repo.repoID}).`);
      callback(null, []);
    } else {
      logger.debug(`Encountered warnings when validating repo data for ${repo.name} (${repo.repoID}).`);
      let warnings = this.validators["repo"]["strict"].errors;
      logger.debug(warnings);
      callback(null, warnings);
    }
  }

  /**
   * Validate the repo with a enhaced json schema.
   * @param {object} repo 
   * @param {object} callback 
   */
  _validateRepoEnhanced(repo, callback) {
    // validate for enhancements
    let valid = this.validators["repo"]["enhanced"](repo);
    if (valid) {
      // logger.info(`Didn't find any warnings for ${repo.name} (${repo.repoID}).`);
      callback(null, []);
    } else {
      logger.debug(`Encountered potential enhancements when validating repo data for ${repo.name}`
        + `(${repo.repoID}).`);
      let enhancements = this.validators["repo"]["enhanced"].errors;
      logger.debug(enhancements);
      callback(null, enhancements);
    }
  }

  /**
   * Remove errors that fall under specific special cases for errors.
   * @param {object} repo 
   * @param {object} errors 
   */
  _removeSpecialCaseErrors(repo, errors) {
    // NOTE: it is possible to handle these case(s) by altering the json-schema,
    // but since it would require a lot of duplication of the schema definition
    // (in some cases), it is more convenient to strip out warning which do not
    // apply here...
    return errors.filter((error) => {
      // if this isn't an open source project, remove warnings due to a missing
      // `repository` field
      if (!repo.openSourceProject) {
        if (error.params && error.params.missingProperty === "repository") {
          return false;
        }

      }
      return true;
    });
  }

  /**
   * Remove errors that fall under specific special cases for warnings.
   * @param {object} repo 
   * @param {object} warnings 
   */
  _removeSpecialCaseWarnings(repo, warnings) {
    // NOTE: it is possible to handle these case(s) by altering the json-schema,
    // but since it would require a lot of duplication of the schema definition
    // (in some cases), it is more convenient to strip out warning which do not
    // apply here...
    return warnings.filter((warning) => {
      // if this isn't an open source project, remove warnings due to a missing
      // `repository` field
      if (!repo.openSourceProject) {
        if (warning.params && warning.params.missingProperty === "repository") {
          return false;
        }
        if (warning.dataPath === ".repository" && repo.repository === null) {
          logger("removing warning for closed source repo with license===null");
          return false;
        }
      }
      if (warning.dataPath === ".license" && repo.license === null) {
        logger("removing warning for closed source repo with repository===null");
        return false;
      }

      return true;
    });
  }

  /**
   * Remove errors that fall under specific special cases for enhancements.
   * @param {object} repo 
   * @param {object} enhancements 
   */
  _removeSpecialCaseEnhancements(repo, enhancements) {
    // NOTE: it is possible to handle these case(s) by altering the json-schema,
    // but since it would require a lot of duplication of the schema definition
    // (in some cases), it is more convenient to strip out warning which do not
    // apply here...
    return enhancements.filter((enhancement) => {
      // if this isn't an open source project, remove warnings due to a missing
      // `repository` field
      if (!repo.openSourceProject) {
        if (enhancement.params && enhancement.params.missingProperty === "repository") {
          return false;
        }
        //schema v1.0.1 requires the license element but technically allows it to be null, even for OSS.
        //nudge here to include license info for OSS
        if (enhancement.dataPath === ".license" && repo.license === null) {
          logger("removing enhancement request for closed source repo with repository===null");
          return false;
        }
        if (enhancement.dataPath === ".repository" && repo.repository === null) {
          logger("removing enhancement request for closed source repo with license===null");
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Validate a given repo's structure.
   * @param {object} repo 
   * @param {object} agency 
   * @param {function} callback 
   */
  validateRepo(repo, agency, callback) {
    logger.debug(`Validating repo data for ${repo.name} (${repo.repoID})...`);

    let result = {
      "repoID": repo.repoID,
      "agency": agency.name,
      "organization": repo.organization,
      "project_name": repo.name,
      issues: {
        enhancements: [],
        warnings: [],
        errors: []
      }
    };

    async.waterfall([
      (next) => {
        this._validateRepoRelaxed(repo, next);
      },
      (validationErrors, next) => {
        let errors = this._removeSpecialCaseErrors(repo, validationErrors);
        result.issues.errors = errors;
        this._validateRepoStrict(repo, next);
      },
      (validationWarnings, next) => {
        // remove errors from warnings
        let warnings = Utils.removeDupes(validationWarnings, result.issues.errors);
        // remove special case warnings
        warnings = this._removeSpecialCaseWarnings(repo, warnings);

        result.issues.warnings = warnings;

        // TODO: remove fields which have warnings from the repo object
        // (possibly necessary to avoid indexing issues)
        this._validateRepoEnhanced(repo, next);
      },
      (validationEnhancements, next) => {
        // remove errors and warnings from enhancements
        let enhancements = Utils.removeDupes(validationEnhancements, result.issues.errors);

        enhancements = Utils.removeDupes(enhancements, result.issues.warnings);

        // remove special case enhancements
        enhancements = this._removeSpecialCaseEnhancements(repo, enhancements);

        result.issues.enhancements = enhancements;
        next();
      }
    ], (err) => {
      if (err) {
        logger.error(err);
      } else {
        // check to see if we encountered any validation errors
        if (result.issues.errors.length) {
          // if we encountered any, make a new error to return in the callback
          err = new Error(
            `Encountered ${result.issues.errors.length} validation errors.`
          );
        }
      }

      callback(err, result);
    });
  }

}

module.exports = {
  getValidator
};

