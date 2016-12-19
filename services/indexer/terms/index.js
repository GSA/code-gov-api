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

const ES_MAPPING = require("../../../indexes/term/mapping.json");
const ES_SETTINGS = require("../../../indexes/term/settings.json");
const ES_PARAMS = {
  "esAlias": "terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

// NOTE: dependent on elasticsearch repos being indexed

class RepoReaderStream extends Transform {

  
}

class TermIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "term-indexer";
  }

  constructor(adapter, agencyEndpointsFile, params) {
    super(adapter, params);
    this.indexCounter = 0;
    this.agencyEndpointsFile = agencyEndpointsFile;
  }

  indexTerms(callback) {
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
