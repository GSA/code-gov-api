const fs                  = require("fs");
const path                = require("path");
const request             = require("request");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;
const Transform           = require("stream").Transform;
const moment              = require("moment");

const config              = require("../../../config");
const SearchStream        = require("../../../utils/search_stream");
const Validator           = require("../../validator");
const Formatter           = require("../../formatter");
const Reporter            = require("../../reporter");
const AbstractIndexer     = require("../abstract_indexer");

// NOTE: dependent on elasticsearch repos being indexed

const ES_REPO_MAPPING = require("../../../indexes/repo/mapping.json");
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

/**
 * Loads terms into memory from supplied repos.
 *
 * @class RepoTermLoaderStream
 */
class RepoTermLoaderStream extends Transform {

  constructor(termIndexer) {
    super({ objectMode: true });
    this.termIndexer = termIndexer;
    this.logger = termIndexer.logger;

    this.terms = {};
    config.TERM_TYPES_TO_INDEX.forEach((termType) => {
      this.terms[termType] = {};
    });

    this.termMaxes = {};
    config.TERM_TYPES_TO_INDEX.forEach((termType) => {
      this.termMaxes[termType] = 0;
    });
  }

  _loadTermsFromRepo(repo, callback) {
    this.logger.info(`Loading terms from repo (${repo.repoID})...`);

    const _loadTerm = (termType, termVal) => {
      // TODO: might not want to be so forceful about lower case
      if(termVal!=null){termVal = termVal.toLowerCase();}
      if (typeof this.terms[termType][termVal] === "undefined") {
        this.terms[termType][termVal] = 1;
      } else {
        this.terms[termType][termVal] += 1;
      }
    };

    config.TERM_TYPES_TO_INDEX.forEach((termType) => {
      let term = _.get(repo, termType);
      if (term !== undefined && typeof term !== undefined) {
        if (Array.isArray(term)) {
          term.forEach((t) => {
            _loadTerm(termType, t);
          });
        } else {
          _loadTerm(termType, term);
        }
      }
    });

    return callback();
  }

  _calcMostFrequentTerms() {
    this.logger.info(`Calculating most frequent terms...`);
    _.forOwn(this.terms, (termTypeObj, termType) => {
      _.forOwn(termTypeObj, (termCount, termName) => {
        if (termCount > this.termMaxes[termType]) {
          this.termMaxes[termType] = termCount;
        }
      });
    });
  }

  _pushTermObjects() {
    this.logger.info(`Pushing term objects to stream...`);
    _.forOwn(this.terms, (termTypeObj, termType) => {
      _.forOwn(termTypeObj, (termCount, termName) => {
        this.logger.info(`Pushing term [${termType}](${termName})...`);
        let termCountNormalized = termCount / this.termMaxes[termType];
        let term = {
          term_key: termName,
          term: termName,
          term_type: termType,
          count: termCount,
          count_normalized: termCountNormalized
        };
        this.push(term);
      });
    });
  }

  _transform(repo, enc, callback) {
    this._loadTermsFromRepo(repo, callback);
  }

  _flush(callback) {
    this._calcMostFrequentTerms();
    this._pushTermObjects();
    return callback();
  }
}

class RepoTermIndexerStream extends Writable {

  constructor(termIndexer) {
    super({ objectMode: true });
    this.termIndexer = termIndexer;
    this.logger = termIndexer.logger;
  }

  _indexTerm(term, done) {
    let id = `${term.term_key}_${term.term_type}`;
    this.logger.info(
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
    this.ss = new SearchStream(adapter, searchQuery);;
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
      (response, next) => { indexer.indexTerms(next); }
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

module.exports = TermIndexer;
