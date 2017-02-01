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
        strict: ajv.compile(require(`${pathToSchemas}/strict.json`)),
        enhanced: ajv.compile(require(`${pathToSchemas}/enhanced.json`))
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


  _validateRepoEnhanced(repo, callback) {
    // validate for enhancements
    let valid = this.validators["repo"]["enhanced"](repo);
    if (valid) {
      // this.logger.info(`Didn't find any warnings for ${repo.name} (${repo.repoID}).`);
      callback(null, []);
    } else {
      this.logger.info(`Encountered potential enhancements when validating repo data for ${repo.name} (${repo.repoID}).`);
      let enhancements = this.validators["repo"]["enhanced"].errors;
      this.logger.warning(enhancements);
      callback(null, enhancements);
    }
  }



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
          return false;
          this.logger("removing warning for closed source repo with license===null");
        }
        this.logger.info(warning.dataPath);       
        //if (warning.params && warning.dataPath === ".description" && warning.params.type === "string"){
        //  return false;
       
      }
      if (warning.dataPath === ".license" && repo.license === null) {
          return false;
          this.logger("removing warning for closed source repo with repository===null");
      }



      return true;
    });
  }

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
          return false;
          this.logger("removing enhancement request for closed source repo with repository===null");
        }
        if (enhancement.dataPath === ".repository" && repo.repository === null) {
          return false;
          this.logger("removing enhancement request for closed source repo with license===null");
        }
        this.logger.info(enhancement.dataPath);       
        //if (warning.params && warning.dataPath === ".description" && warning.params.type === "string"){
        //  return false;
       
      }

      return true;
    });
  }



  validateRepo(repo, callback) {
    this.logger.info(`Validating repo data for ${repo.name} (${repo.repoID})...`);

    let result = {
      "repoID": repo.repoID,
      "agency": repo.agency.name,
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
