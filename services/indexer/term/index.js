const async               = require("async");
const Writable            = require("stream").Writable;
const SearchStream        = require("../../../utils/search_stream");
const AbstractIndexer     = require("../abstract_indexer");
const RepoTermLoaderStream= require("./repo_term_loader_stream");

// NOTE: dependent on elasticsearch repos being indexed

const ES_REPO_MAPPING = require("../../../indexes/repo/mapping_100.json");
const ES_REPO_SETTINGS = require("../../../indexes/repo/settings.json");
const ES_REPO_PARAMS = {
  "esAlias": "repos",
  "esType": "repo",
  "esMapping": ES_REPO_MAPPING,
  "esSettings": ES_REPO_SETTINGS
};

const ES_TERM_MAPPING = require("../../../indexes/term/mapping.json");
const ES_TERM_SETTINGS = require("../../../indexes/term/settings.json");
const ES_TERM_PARAMS = {
  "esAlias": "terms",
  "esType": "term",
  "esMapping": ES_TERM_MAPPING,
  "esSettings": ES_TERM_SETTINGS
};

class RepoTermIndexerStream extends Writable {

  constructor(termIndexer) {
    super({ objectMode: true });
    this.termIndexer = termIndexer;
    this.logger = termIndexer.logger;
  }

  _indexTerm(term, done) {
    let id = `${term.term_key}_${term.term_type}`;
    this.logger.debug(
      `Indexing term (${id}).`);
    this.termIndexer.indexDocument({
      "index": this.termIndexer.esIndex,
      "type": this.termIndexer.esType,
      "id": id,
      "body": term
    }, (err, response, status) => {
      if(err) {
        this.logger.error(err);
      }
      if (status) {
        this.logger.debug('Status', status);
      }
      this.termIndexer.indexCounter++;

      return done(err, response);
    });
  }

  _write(term, enc, next) {
    this._indexTerm(term, (err, response) => {
      return next(null, response);
    });
  }

}

class TermIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "term-indexer";
  }

  constructor(adapter, params) {
    super(adapter, params);
    let searchQuery = {
      index: ES_REPO_PARAMS.esAlias,
      type: ES_REPO_PARAMS.esType,
      body: {}
    };
    this.ss = new SearchStream(adapter, searchQuery);
    this.indexCounter = 0;
  }

  indexTerms(callback) {
    let ss = this.ss;
    let rs = new RepoTermLoaderStream(this);
    let is = new RepoTermIndexerStream(this);

    ss.pipe(rs).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
      callback();
    });
  }

  static init(adapter, callback) {
    let indexer = new TermIndexer(adapter, ES_TERM_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    async.waterfall([
      (next) => {
        indexer.indexExists(next);
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
        indexer.indexTerms(next);
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

module.exports = TermIndexer;
