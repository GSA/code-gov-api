const fs                  = require("fs");
const path                = require("path");
const request             = require("request");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;
const Transform           = require("stream").Transform;
const JSONStream          = require("JSONStream");
const moment              = require("moment");

const Validator           = require("../../validator");
const Formatter           = require("../../formatter");
const Reporter            = require("../../reporter");
const AbstractIndexer     = require("../abstract_indexer");

const ES_MAPPING = require("../../../indexes/repo/mapping.json");
const ES_SETTINGS = require("../../../indexes/repo/settings.json");
const ES_PARAMS = {
  "esAlias": "repos",
  "esType": "repo",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

// TODO: need to supplement with events

class AgencyJsonStream extends Transform {

  constructor(repoIndexer) {
    super({objectMode: true});
    this.repoIndexer = repoIndexer;
    this.logger = repoIndexer.logger;
  }

  _handleResponse(data, callback) {
    let agencyData = {};
    try {
      agencyData = JSON.parse(data);
    } catch(err) {
      this.logger.error(err);
      return callback(err);
    }
    return callback(null, agencyData);
  }

  _fetchAgencyReposRemote(agencyUrl, callback) {
    this.logger.info(`Fetching remote agency repos from ${agencyUrl}...`);

    request({ followAllRedirects: true, url: agencyUrl },
      (err, response, body) => {
        if (err) {
          this.logger.error(err);
          return callback(err, {});
        }

        this._handleResponse(body, callback);
      }
    );
  }

  _fetchAgencyReposLocal(agencyUrl, callback) {
    const filePath = path.join(__dirname, "../../..", agencyUrl);
    this.logger.info(`Fetching local agency repos from ${filePath}...`);

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        this.logger.error(err);
        return callback(err, {});
      }

      this._handleResponse(data, callback);
    });
  }

  _fetchAgencyRepos(agency, next) {
    let agencyUrl = agency.code_url;
    let agencyName = agency.acronym;
    // TODO: need to incorporate fallback data

    const _processAgencyData = (err, agencyData) => {
      if (err) {
        this.logger.error(`Error when fetching (${agencyUrl}).`);
        Reporter.reportStatus(agencyName, "FAILURE: FETCH FAILED");
        return next();
      } else if (agencyData === {}) {
        this.logger.warning(`Missing data in (${agencyUrl}).`);
        Reporter.reportStatus(agencyName, "FAILURE: MISSING DATA");
        return next();
      } else if (agencyData.projects && agencyData.projects.length > 0) {
        this.logger.info(`Processing data from (${agencyUrl}).`);
        let numValidationErrors = 0;
        let numValidationWarnings = 0;
        async.eachSeries(agencyData.projects, (project, done) => {
          // add agency to project (we need it for formatting)
          project.agency = agency;
          Formatter.formatRepo(project, (err, formattedProject) => {
            if (err) {
              // swallow the error and continue to process other projects
              return done();
            }
            Validator.validateRepo(project, (err, validationResult) => {
              if (validationResult.issues) {
                if (validationResult.issues.errors.length ||
                  validationResult.issues.warnings.length) {
                    Reporter.reportIssues(agencyName, validationResult);
                    numValidationErrors +=
                      validationResult.issues.errors.length;
                    numValidationWarnings +=
                      validationResult.issues.warnings.length;
                }
              }
              if (err) {
                // swallow the error and continue to process other projects
                return done();
              }
              this.push(formattedProject);
              return done();
            });
          });
        }, () => {
          if (numValidationErrors > 0) {
            Reporter.reportStatus(agencyName,
              `PARTIAL SUCCESS: ${numValidationErrors} ERRORS`);
          } else if (numValidationWarnings > 0) {
            Reporter.reportStatus(agencyName,
              `PARTIAL SUCCESS: ${numValidationWarnings} WARNINGS`);
          } else {
            Reporter.reportStatus(agencyName, "SUCCESS");
          }
          next();
        });
      } else {
        this.logger.error(
          `Missing projects for agency (${agencyName}).`
        );
        Reporter.reportStatus(agencyName, "FAILURE: MISSING PROJECTS DATA");
        return next();
      }
    };

    // Crude detection of whether the url is a remote or local reference.
    // If remote, make a request, otherwise, read the file.
    if (agencyUrl.substring(0, 4) === "http") {
      this._fetchAgencyReposRemote(agencyUrl, _processAgencyData);
    } else {
      this._fetchAgencyReposLocal(agencyUrl, _processAgencyData);
    }
  }

  _transform(agency, enc, next) {
    this._fetchAgencyRepos(agency, next);
  }

}

class AgencyRepoIndexerStream extends Writable {

  constructor(repoIndexer) {
    super({objectMode: true});
    this.repoIndexer = repoIndexer;
    this.logger = repoIndexer.logger;
  }

  _indexRepo(repo, done) {
    this.logger.info(
      `Indexing repository (${repo.repoID}).`);

    this.repoIndexer.indexDocument({
      "index": this.repoIndexer.esIndex,
      "type": this.repoIndexer.esType,
      "id": repo.repoID,
      "body": repo
    }, (err, response, status) => {
      if(err) {
        this.logger.error(err);
      }
      this.repoIndexer.indexCounter++;

      return done(err, response);
    });
  }

  _write(repo, enc, next) {
    this._indexRepo(repo, (err, response) => {
      return next(null, response);
    });
  }
}

class RepoIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "repo-indexer";
  }

  constructor(adapter, agencyEndpointsFile, params) {
    super(adapter, params);
    this.indexCounter = 0;
    this.agencyEndpointsFile = agencyEndpointsFile;
  }

  indexRepos(callback) {
    let rs = fs.createReadStream(this.agencyEndpointsFile);
    let js = JSONStream.parse("*");
    let as = new AgencyJsonStream(this);
    let is = new AgencyRepoIndexerStream(this);

    rs.pipe(js).pipe(as).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
      callback();
    });
  }

  static init(adapter, agencyEndpointsFile, callback) {
    let indexer = new RepoIndexer(adapter, agencyEndpointsFile, ES_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    async.waterfall([
      (next) => { indexer.indexExists(next); },
      (exists, next) => {
        if(exists) {
          indexer.deleteIndex(next)
        } else {
          next(null, null);
        }
      },
      (response, next) => { indexer.initIndex(next); },
      (response, next) => { indexer.initMapping(next); },
      (response, next) => { indexer.indexRepos(next); },
      (next) => { Reporter.writeReportToFile(next); }
    ], (err) => {
      if(err) { indexer.logger.error(err); }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      return callback(err, {
        esIndex: indexer.esIndex,
        esAlias: indexer.esAlias
      });
    });
  }

}

module.exports = RepoIndexer;
