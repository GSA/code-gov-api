const async                 = require("async");

const RepoIndexer           = require("./repo/index.js");
const TermIndexer           = require("./term/index.js");

const Logger                = require("../../utils/logger");

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
  constructor() {
    this.logger = new Logger({name: "term-index-script"});
  }

  index(callback) {
    async.waterfall([
      (next) => {
        let repoIndexer = new RepoIndexer();
        repoIndexer.index(next);
      },
      (next) => {
        let termIndexer = new TermIndexer();
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

// If we are running this module directly from Node this code will execute.
// This will index all items taking our default input.
if (require.main === module) {
  let indexer = new Indexer();
  indexer.index((err) => {
    if (err) {
      indexer.logger.error(err);
    }
  });
}

module.exports = Indexer;
