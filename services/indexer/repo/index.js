const fs                  = require("fs");
const request             = require("request");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;
const Transform           = require("stream").Transform;
const JSONStream          = require("JSONStream");
const moment              = require("moment");

const AbstractIndexer     = require("../abstract_indexer");

const ES_MAPPING = require("../../../indexes/repo/mapping.json");
const ES_SETTINGS = require("../../../indexes/repo/settings.json");
const ES_PARAMS = {
  "esAlias": "repos",
  "esType": "repo",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

class AgencyJsonStream extends Transform {

  constructor(repoIndexer) {
    super({objectMode: true});
    this.repoIndexer = repoIndexer;
    this.logger = repoIndexer.logger;
  }

  _fetchAgencyRepo(agencyUrl, next) {
    this.logger.info(agencyUrl);
    request(agencyUrl, (err, response, body) => {
      if (err) {
        this.logger.error(err);
        return next(null, null);
      }

      let agencyData = JSON.parse(body);
      agencyData.projects.forEach((repo) => {
        this.push(repo);
      });
      return next();
    });
  }

  _transform(agency, enc, next) {
    this._fetchAgencyRepo(agency.repos_url, next);
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
      `Indexing repo with repoID (${repo.repoID}).`);

    this.repoIndexer.indexDocument({
      "index": this.repoIndexer.esIndex,
      "type": this.repoIndexer.esType,
      "id": repo.repoID,
      "body": repo
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
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
      (response, next) => { indexer.indexRepos(next); }
    ], (err) => {
      if(err) { indexer.logger.error(err); }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      return callback(err,{
        esIndex: indexer.esIndex,
        esAlias: indexer.esAlias
      });
    });
  }

}

module.exports = RepoIndexer;
