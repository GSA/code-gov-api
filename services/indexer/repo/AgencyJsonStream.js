const path = require('path');
const { Transform } = require("stream");
const fetch = require('node-fetch');
const Jsonfile = require("jsonfile");
const Logger = require('../../../utils/logger');
const { getValidator } = require('../../validator');
const Formatter = require('../../formatter');
const Reporter = require("../../reporter");
const Utils = require("../../../utils");
const RulesEngine = require('simple-rules-engine');
const getRules = require('../../validator/rules');
const logger = new Logger({name: 'agency-json-stream'});

class AgencyJsonStream extends Transform {
  constructor(fetchedDir, fallbackDir, config) {
    super({
      objectMode: true
    });
    this.fetchedDir = fetchedDir;
    this.fallbackDir = fallbackDir;
    this.config = config;
  }

  _saveFetchedCodeJson(agencyAcronym, codeJson) {
    logger.debug('Entered saveFetchedCodeJson - Agency: ', agencyAcronym);

    return new Promise((fulfill, reject) => {
      Jsonfile.spaces = 2;
      const fetchedFilepath = path.join(this.fetchedDir, `${agencyAcronym}.json`);

      try {
        Jsonfile.writeFile(fetchedFilepath, codeJson, { spaces: 2 }, (err) => {
          if (err) {
            reject(err);
          } else {
            fulfill(codeJson);
          }
        });
      } catch(err) {
        reject(err);
      }
    });
  }

  _readFallbackData(agency, fallbackDir, fallbackFile) {
    Reporter.reportFallbackUsed(agency.acronym, true);
    return new Promise((resolve, reject) => {
      Jsonfile.readFile(path.join(fallbackDir, fallbackFile), (err, jsonData) => {
        if(err) {
          reject(`errorMessage ${fallbackFile} - ${err}`);
        }
        resolve(jsonData);
      });
    });
  }

  _getAgencyCodeJson(agency){
    logger.info('Entered _getAgencyCodeJson - Agency: ', agency.acronym);

    if(this.config.prod_envs.includes(process.env.NODE_ENV)) {
      const errorMessage = 'FAILURE: There was an error fetching the code.json:';
      return fetch(agency.codeUrl, {
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'code.gov' },
        timeout: 180000
      })
        .then(response => {
          if(response.status >= 400) {
            logger.warning(
              `${errorMessage} ${agency.codeUrl} returned ${response.status} and
              Content-Type ${response.headers['Content-Type']}. Using fallback data for indexing.`);

            Reporter.reportFallbackUsed(agency.acronym, true);
            return this._readFallbackData(agency, this.fallbackDir, agency.fallback_file);
          }
          Reporter.reportFallbackUsed(agency.acronym, false);
          return response.text()
            .then(responseText => JSON.parse( responseText.replace(/^\uFEFF/, '') ));
        })
        .then(jsonData => {
          this._saveFetchedCodeJson(agency.acronym, jsonData)
            .then(() => logger.info(`Saved fetched data for ${agency.acronym}`))
            .catch(error => logger.error(`Could not save fetched data for ${agency.acronym} - ${error}`));

          return jsonData;
        })
        .catch(error => {
          logger.warning(`${errorMessage} ${agency.codeUrl} - ${error.message}. Using fallback data for indexing.`);
          Reporter.reportFallbackUsed(agency.acronym, true);
          return this._readFallbackData(agency, this.fallbackDir, agency.fallback_file);
        });
    } else {
      Reporter.reportFallbackUsed(agency.acronym, true);
      return this._readFallbackData(agency, this.fallbackDir, agency.fallback_file);
    }
  }

  /**
   * Validate agency repositories.
   * @param {object} agency Object with agency metadata.
   * @param {object} codeJson Object with the complete code inventory for the supplied agency.
   * @returns {object} Object with schemaVersion of the supplied code.json and an array of it's validated repositories.
   */
  _validateAgencyRepos(agency, codeJson) {
    logger.debug('Entered _validateAgencyRepos');

    let reportDetails = [];
    let reportString = "";
    let totalErrors = 0;
    let validationTotals = {
      errors: 0,
      warnings: 0,
      enhancements: 0
    };

    Reporter.reportVersion(agency.acronym, codeJson.version);

    let resultRepos = [];
    const repos = Utils.getCodeJsonRepos(codeJson);

    if(this.config.supportedSchemaVersions.includes(codeJson.version)) {
      if(!repos || repos.length < 1) {
        logger.error(`ERROR: ${agency.acronym} code.json has no projects or releaseEvents.`);
        reportString = "NOT COMPLIANT: ";
        reportDetails.push(`Agency has not releases/repositories published.`);
      } else {
        repos.map(repo => {
          const repoId = Utils.transformStringToKey([agency.acronym, repo.organization, repo.name].join("_"));
          const validator = getValidator(codeJson);

          return validator.validateRepo(repo, agency, (error, results) => {
            if(error) {
              logger.debug(`Error validating repo with repoID ${repoId}.`);
            }
            if(results.issues) {
              validationTotals.errors += results.issues.errors.length ? results.issues.errors.length : 0;
              validationTotals.warnings += results.issues.warnings.length ? results.issues.warnings.length : 0;
              validationTotals.enhancements += results.issues.enhancements.length ?
                results.issues.enhancements.length : 0;

              Reporter.reportIssues(agency.acronym, results);
            }
            validator.cleaner(repo);
            resultRepos.push(repo);
          });
        });

        if(validationTotals.errors) {
          totalErrors += validationTotals.errors;
          reportDetails.push(`${validationTotals.errors} ERRORS`);
        }
        if(validationTotals.warnings) {
          totalErrors += validationTotals.warnings;
          reportDetails.push(`${validationTotals.warnings} WARNINGS`);
        }

        if(validationTotals.enhancements) {
          reportDetails.push(`${validationTotals.enhancements} REQUESTED ENHANCEMENTS`);
        }

        if(totalErrors) {
          reportString= "NOT FULLY COMPLIANT: ";
        } else {
          agency.requirements.schemaFormat = 1;
          reportString= "FULLY COMPLIANT: ";
        }
      }
    } else {
      Reporter.reportIssues(agency.acronym, [{
        message: `${codeJson.version} is not a valid schema version`
      }]);
      reportDetails.push(`1 ERRORS`);
    }

    reportString += reportDetails.join(", ");
    Reporter.reportStatus(agency.acronym, reportString);

    agency.requirements.overallCompliance = this._calculateOverallCompliance(agency.requirements);
    Reporter.reportRequirements(agency.acronym, agency.requirements);

    return Promise.resolve({
      schemaVersion: Utils.getCodeJsonVersion(codeJson),
      repos: resultRepos
    });
  }

  _calculateMean(values) {
    return values.reduce((total, currentValue) => total + currentValue) / values.length;
  }

  _calculateOverallCompliance(requirements) {
    // TODO: align this approach with project-open-data's approach
    const compliances = [
      requirements.agencyWidePolicy,
      requirements.openSourceRequirement,
      requirements.inventoryRequirement
    ];

    return this._calculateMean(compliances);
  }

  _formatRepos(agency, validatedRepos) {

    logger.debug('Entered _formatCodeJson - Agency: ', agency.acronym);

    const {schemaVersion, repos} = validatedRepos;

    return Promise.all(
      repos.map(repo => {
        repo.agency = agency;
        return Formatter.formatRepo(schemaVersion, repo);
      })
    );
  }

  _transform(agency, enc, callback) {
    logger.debug('Entered _transform - Agency: ', agency.acronym);
    Reporter.reportMetadata(agency.acronym, { agency });

    this._getAgencyCodeJson(agency)
      .then(codeJson => this._validateAgencyRepos(agency, codeJson))
      .then(validatedRepos => this._formatRepos(agency, validatedRepos))
      .then(formattedRepos => {
        const engine = new RulesEngine(getRules());

        return Promise.all(
          formattedRepos.map(repo => {
            return engine.execute(repo);
          })
        );
      })
      .then(scoredRepos => scoredRepos.forEach(repo => this.push(repo)))
      .then(() => callback())
      .catch(error => {
        logger.error(error);
        callback();
      });
  }
}

module.exports = AgencyJsonStream;
