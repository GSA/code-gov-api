const path = require('path');
const { Transform } = require("stream");
const fetch = require('node-fetch');
const Jsonfile = require("jsonfile");
const Logger = require('../../../utils/logger');
const { getValidator } = require('@code.gov/code-gov-validator');
const Formatter = require('../../formatter');
const Reporter = require("../../reporter");
const Utils = require("../../../utils");
const RulesEngine = require('simple-rules-engine');
const getRules = require('../../validator/rules');
const logger = new Logger({name: 'agency-json-stream'});
const encoding = require('encoding');

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

    Jsonfile.spaces = 2;
    const fetchedFilepath = path.join(this.fetchedDir, `${agencyAcronym}.json`);

    try {
      Jsonfile.writeFile(fetchedFilepath, codeJson, { spaces: 2 }, (error) => {
        if (error) {
          logger.error(error);
        } else {
          logger.debug(`Saved fetched data for ${agencyAcronym}`, fetchedFilepath);
        }
      });
    } catch(err) {
      logger.error(err);
    }
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

  async _getAgencyCodeJson(agency){
    logger.info('Entered _getAgencyCodeJson - Agency: ', agency.acronym);

    if(this.config.isProd) {
      const errorMessage = 'FAILURE: There was an error fetching the code.json:';
      let response;

      try {
        response = await fetch(agency.codeUrl, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'code.gov' },
          timeout: 180000
        });
      } catch(error) {
        logger.error(`Could not fetch code.json for agency: ${agency}`, error);
      }

      if(response && response.status >= 400) {
        logger.warning(
          `${errorMessage} ${agency.codeUrl} returned ${response.status} and
          Content-Type ${response.headers['Content-Type']}. Using fallback data for indexing.`);

        Reporter.reportFallbackUsed(agency.acronym, true);
        return this._readFallbackData(agency, this.fallbackDir, agency.fallback_file);
      }

      let jsonData = {};
      try {

        const responseBuffer = await response.buffer();
        if(responseBuffer.indexOf('\uFEFF', 0, 'utf16le') === 0) {
          jsonData = JSON.parse(encoding.convert(responseBuffer, 'utf8', 'utf16le'));
        } else {
          jsonData = JSON.parse(responseBuffer.toString());
        }

        this._saveFetchedCodeJson(agency.acronym, jsonData);

        return jsonData;
      } catch(error) {
        logger.error(`There was an error parsing JSON for agency: ${agency.acronym}`, error);
        Reporter.reportFallbackUsed(agency.acronym, true);
        return this._readFallbackData(agency, this.fallbackDir, agency.fallback_file);
      }
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
  async _validateAgencyRepos(agency, codeJson) {
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
        resultRepos = repos.map( repo => {
          // const repoId = Utils.transformStringToKey([agency.acronym, repo.organization, repo.name].join("_"));
          const validator = getValidator(codeJson);

          validator.validateRepo(repo, agency)
            .then(results => {
              validationTotals.errors = results.issues.errors;
              validationTotals.warnings = results.issues.warnings;
              validationTotals.enhancements = results.issues.enhancements;

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
              Reporter.reportIssues(agency.acronym, results);
            })
            .catch(error => logger.error(error));
          validator.cleaner(repo);
          return repo;
        });
      }
    } else {
      Reporter.reportIssues(agency.acronym, [{
        message: `${codeJson.version} is not a valid schema version`
      }]);
      reportDetails.push(`1 ERROR`);
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
      repos.map(async repo => {
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
