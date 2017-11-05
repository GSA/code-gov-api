const config              = require("../../../config");
const fs                  = require("fs");
const async               = require("async");
const _                   = require("lodash");
const { Writable }        = require("stream");
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

  indexRepos(callback) {
    let rs = fs.createReadStream(this.agencyEndpointsFile);
    let js = JSONStream.parse("*");
    let as = new AgencyJsonStream();
    let is = new RepoIndexerStream(this);

    rs.pipe(js).pipe(as).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
      callback();
    });
  }

  static init(adapter, agencyEndpointsFile, callback) {
    let indexer = new RepoIndexer(adapter, agencyEndpointsFile, ES_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    async.waterfall([
      (next) => {
        indexer.indexExists()
          .then((status, response) => {
            next();
          })
          .catch(err => {
            this.logger.error(err);
          });
      },
      (exists, next) => {
        if(exists) {
          indexer.deleteIndex(next);
        } else {
          next(null, null);
        }
      },
      (response, next) => {
        indexer.initIndex(next);
      },
      (response, next) => {
        indexer.initMapping(next);
      },
      (response, next) => {
        indexer.indexRepos(next);
      },
      (next) => {
        Reporter.writeReportToFile(next);
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
