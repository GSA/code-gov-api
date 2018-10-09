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
    this.logger = new Logger({ name: "index-script", level: config.LOGGER_LEVEL });
    this.config = config;
  }

  async index() {
    let repoIndexer = new RepoIndexer(this.config);
    let termIndexer = new TermIndexer(this.config);

    try {
      await repoIndexer.index();
      await termIndexer.index();
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
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
  indexer.index()
    .then(() => indexer.logger.info('Indexing process complete'))
    .catch(error => indexer.logger.error(error));
}

module.exports = Indexer;
