/**
 * Loads terms into memory from supplied repos.
 *
 * @class RepoTermLoaderStream
 */
const Transform = require("stream").Transform;

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
      termVal = termVal.toLowerCase();
      if (this.terms[termType][termVal] === undefined) {
        this.terms[termType][termVal] = 1;
      } else {
        this.terms[termType][termVal] += 1;
      }
    };

    config.TERM_TYPES_TO_INDEX.forEach((termType) => {
      let term = _.get(repo, termType);
      if (term !== undefined && term !== null) {
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

module.exports = RepoTermLoaderStream;