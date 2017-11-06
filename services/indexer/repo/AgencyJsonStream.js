const fs = require("fs");
const path = require('path');
const { Transform } = require("stream");
const config = require("../../../config");
const request = require("request");
const Jsonfile = require("jsonfile");
const Logger = require('../../../utils/logger')
const _ = require("lodash");
const Validator = require('../../validator');
const Formatter = require('../../formatter');
const Reporter = require("../../reporter");
const Utils = require("../../../utils");

const logger = new Logger({name: 'agency-json-stream'});
const fetchedDir = path.join(__dirname, '../../../data/fetched/');

class AgencyJsonStream extends Transform {
  constructor() {
    super({
      objectMode: true
    });
  }

  _saveFetchedCodeJson(agencyAcronym, codeJson) {
    logger.debug('Entered saveFetchedCodeJson - Agency: ', agencyAcronym);

    return new Promise((fulfill, reject) => {
      Jsonfile.spaces = 2;
      const filename = `${agencyAcronym}.json`;
      const fetchedFilepath = path.join(fetchedDir, filename);
    
      try {
        Jsonfile.writeFile(fetchedFilepath, codeJson, (err) => {
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

  _getAgencyCodeJson(agency){
    logger.debug('Entered saveFetchedCodeJson - Agency: ', agency.acronym);

    return new Promise((fulfill, reject) => {
      const requestParams = {
        followAllRedirects: true,
        rejectUnauthorized: false,
        url: agency.codeUrl,
        headers: {
          'User-Agent': 'code.gov',
        }
      };
  
      if(process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
        request(requestParams, (err, response, body) => {
          const errorMessage = 'FAILURE: There was an error fetching the code.json:';
          if(err) {
            reject(`${errorMessage} ${agency.codeUrl} - ${err}`);
          } else {
            if(response.statusCode === 200) {
              const formattedData = body.replace(/^\uFEFF/, '');
    
              this._saveFetchedCodeJson(agency.acronym, JSON.parse(formattedData))
                .then(data => fulfill(data))
                .catch(err => reject(`errorMessage ${agency.codeUrl} - ${err}`));
            } else {
              reject(`${errorMessage} ${agency.codeUrl} returned ${response.statusCode}`);
            }
          }
        });
      } else {
        const fallbackPath = path.join('../../../', agency.codeUrl);
        const jsonData = require(fallbackPath);
        this._saveFetchedCodeJson(agency.acronym, jsonData)
          .then(data => fulfill(data))
          .catch(err => reject(`errorMessage ${agency.codeUrl} - ${err}`));
      }
    });
  }

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

    codeJson.projects.map(repo => {
      const repoId = Utils.transformStringToKey([agency.acronym, repo.organization, repo.name].join("_"));
      
      return Validator.validateRepo(repo, agency, (error, results) => {
        if(error) {
          logger.error(`Error validating repo with repoID ${repoId}. Throwing it out of the indexing process.`);
        } else {
          if(results.issues) {
            validationTotals.errors += results.issues.errors.length ? results.issues.errors.length : 0;
            validationTotals.warnings += results.issues.warnings.length ? results.issues.warnings.length : 0;
            validationTotals.enhancements += results.issues.enhancements.length ? results.issues.enhancements.length : 0;
  
            Reporter.reportIssues(agency.acronym, results);
          }

          resultRepos.push(repo);
        }
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

    reportString += reportDetails.join(", ");
    Reporter.reportStatus(agency.acronym, reportString);

    agency.requirements.overallCompliance = this._calculateOverallCompliance(agency.requirements);
    Reporter.reportRequirements(agency.acronym, agency.requirements);
    
    return Promise.resolve(resultRepos);
  }

  _calculateOverallCompliance(requirements){
    //overallCompliance should be the average of the other requirements.
    //TODO: align this approach with project-open-data's approach
    let overallCompliance = 0;
    for (let req in requirements){
      overallCompliance += requirements[req];
    }
    overallCompliance /= _.size(requirements);
    return overallCompliance;
  }
  
  _formatRepos(agency, repos) {
    logger.debug('Entered _formatCodeJson - Agency: ', agency.acronym);

    repos.map(repo => {
      repo.agency = agency;
      Formatter.formatRepo(repo, (err, formattedRepo) => {
        if (err) {
          const msg = `[Error] Formatting repo: ${repo.name}. Throwing it out of the indexing process.`;
          logger.error(msg, err);
        }
        this.push(formattedRepo);
      });
    });
  }

  _transform(agency, enc, callback) {
    logger.debug('Entered _transform - Agency: ', agency.acronym);
    Reporter.reportMetadata(agency.acronym, { agency });

    this._getAgencyCodeJson(agency)
      .then(codeJson => {
        if(codeJson.projects) {
          return this._validateAgencyRepos(agency, codeJson);
        } else {
          const message = `ERROR: Agency ${agency.acronym} code.json has no projects.`;
          Reporter.reportStatus(agency.acronym, message)
          
          return Promise.reject(message);
        }
      })
      .then(repos => {
        this._formatRepos(agency, repos);
        callback();
      })
      .catch(err => {
        logger.error(err);
        callback();
      });
  }
}

module.exports = AgencyJsonStream;
