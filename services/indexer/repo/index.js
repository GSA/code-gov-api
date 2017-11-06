const fs                  = require("fs");
const async               = require("async");
const JSONStream          = require("JSONStream");
const Reporter            = require("../../reporter");
const AbstractIndexer     = require("../abstract_indexer");
const AgencyJsonStream    = require("../repo/AgencyJsonStream");
const RepoIndexerStream   = require("../repo/RepoIndexStream");
const ES_MAPPING = require("../../../indexes/repo/mapping.json");
const ES_SETTINGS = require("../../../indexes/repo/settings.json");
const ES_PARAMS = {
  "esAlias": "repos",
  "esType": "repo",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

class RepoIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "repo-indexer";
  }

  constructor(adapter, agencyEndpointsFile, params) {
    super(adapter, params);
    this.indexCounter = 0;
    this.agencyEndpointsFile = agencyEndpointsFile;
  }

  indexRepos() {
    let agencyEndpointsStream = fs.createReadStream(this.agencyEndpointsFile);
    let jsonStream = JSONStream.parse("*");
    let agencyJsonStream = new AgencyJsonStream();
    let indexerStream = new RepoIndexerStream(this);

    return new Promise((fulfill, reject) => {
      agencyEndpointsStream
        .pipe(jsonStream)
        .on("error", (error) => {
          reject(error);
        })
        .pipe(agencyJsonStream)
        .on("error", (error) => {
          reject(error);
        })
        .pipe(indexerStream)
        .on("error", (error) => {
          reject(error);
        })
        .on("finish", () => {
          const finishedMsg = `Indexed ${this.indexCounter} ${this.esType} documents.`;
          this.logger.info(finishedMsg);
          fulfill(finishedMsg);
        });
    });
  }

  static init(adapter, agencyEndpointsFile, callback) {
    const indexer = new RepoIndexer(adapter, agencyEndpointsFile, ES_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    async.waterfall([
      (next) => {
        indexer.indexExists()
          .then(response => {
            next(null, response);
          })
          .catch(err => {
            indexer.logger.error(err);
          });
      },
      (exists, next) => {
        if(exists) {
          indexer.deleteIndex()
            .then(response => {
              next(null, response);
            })
            .catch(err => {
              indexer.logger.error(err);
            });
        } else {
          next(null, null);
        }
      },
      (response, next) => {
        indexer.initIndex()
          .then(response => {
            next(null, response);
          })
          .catch(err => {
            indexer.logger.error(err);
          });
      },
      (response, next) => {
        indexer.initMapping()
          .then(response => {
            next(null, response);
          })
          .catch(err => {
            indexer.logger.error(err);
          });
      },
      (response, next) => {
        indexer.indexRepos()
          .then(response => {
            next(null, response);
          })
          .catch(err => {
            indexer.logger.error(err);
          });
      },
      (response, next) => {
        Reporter.writeReportToFile()
          .then(response => {
            next(null, response);
          })
          .catch(err => {
            indexer.logger.error(err);
          });
      }
    ], (err) => {
      if(err) {
        indexer.logger.error(err);
      }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      return callback(err, {
        esIndex: indexer.esIndex,
        esAlias: indexer.esAlias
      });
    });
  }

}

module.exports = RepoIndexer;
