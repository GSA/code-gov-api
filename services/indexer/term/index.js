const Writable            = require("stream");
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

  _indexTerm(term) {
    let id = `${term.term_key}_${term.term_type}`;
    this.logger.debug(`Indexing term (${id}).`);

    return new Promise((resolve, reject) => {
      this.termIndexer.indexDocument({
        "index": this.termIndexer.esIndex,
        "type": this.termIndexer.esType,
        "id": id,
        "body": term
      })
      .then((response, status) => {
        if (status) {
          this.logger.debug('termIndexer.indexDocument - Status', status);
        }
        
        this.termIndexer.indexCounter++;
  
        resolve(response);
      })
      .catch(err => {
        this.logger.error(err);
        reject(err);
      });
    });
  }

  _write(term, enc, next) {
    this._indexTerm(term)
      .then(response => {
        return next(null, response)
      })
      .catch(error => {
        return next(error, null);
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

  indexTerms() {
    let ss = this.ss;
    let rs = new RepoTermLoaderStream(this);
    let is = new RepoTermIndexerStream(this);

    ss.pipe(rs).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
    });
  }

  static init(adapter, callback) {
    let indexer = new TermIndexer(adapter, ES_TERM_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    indexer.indexExists()
      .then((exists) => {
        if(exists) {
          indexer.deleteIndex()
        }
      })
      .then(() => indexer.initIndex())
      .then(() => indexer.initMapping())
      .then(() => indexer.indexTerms())
      .then(() => {
        return callback(null, {
          esIndex: indexer.esIndex,
          esAlias: indexer.esAlias
        });
      })
      .catch(error => {
        indexer.logger.error(error);
        return callback(error, {
          esIndex: indexer.esIndex,
          esAlias: indexer.esAlias
        });
      });
  }

}

module.exports = TermIndexer;
