const async = require("async");
const getConfig = require('../../config');
const RepoIndexer = require("./repo/index.js");
const TermIndexer = require("./term/index.js");
const Logger = require("../../utils/logger");

/**
 * Defines the class responsible for creating and managing the elasticsearch indexes
 *
 * @class Indexer
 */
class Indexer {

  /**
   * Creates an instance of Indexer.
   *
   */
  constructor(config) {
    this.logger = new Logger({name: "index-script"});
    this.config = config;
  }

  index(callback) {
    async.waterfall([
      (next) => {
        let repoIndexer = new RepoIndexer(this.config);
        repoIndexer.index(next);
      },
      (next) => {
        let termIndexer = new TermIndexer(this.config);
        termIndexer.index(next);
      }
    ], (err) => {
      return callback(err);
    });
  }

  schedule(delayInSeconds) {
    setInterval(this.index, delayInSeconds * 1000,
      (err) => {
        if (err) {
          this.logger.error(err);
        }
      });
  }

}

if (require.main === module) {
  const config = getConfig(process.env.NODE_ENV);
  let indexer = new Indexer(config);
  indexer.index((err) => {
    if (err) {
      indexer.logger.error(err);
    }
  });
}

module.exports = Indexer;
