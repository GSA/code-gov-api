const getConfig = require('../../../config');
const TermIndexer = require("../../../services/indexer/term");
const AliasSwapper = require("../../../services/indexer/alias_swapper");
const IndexCleaner = require("../../../services/indexer/index_cleaner");
const IndexOptimizer = require("../../../services/indexer/index_optimizer");
const Logger = require("../../../utils/logger");
const adapter = require('@code.gov/code-gov-adapter');

const DAYS_TO_KEEP = process.env.DAYS_TO_KEEP || 2;

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
    this.logger = new Logger({name: "term-index-script", level: config.LOGGER_LEVEL});
    this.config = config;
    this.elasticsearchAdapter = adapter.elasticsearch.ElasticsearchAdapter;
  }

  /**
   * Index the terms contained in the repos core
   */
  async index() {

    this.logger.info("Started indexing.");

    try {
      const termIndexInfo = await TermIndexer.init(this.elasticsearchAdapter);

      await IndexOptimizer.init(this.elasticsearchAdapter, termIndexInfo, this.config);
      await AliasSwapper.init(this.elasticsearchAdapter, termIndexInfo, this.config);
      await IndexCleaner.init(this.elasticsearchAdapter, termIndexInfo.esAlias, DAYS_TO_KEEP, this.config);

      this.logger.debug(`Finished indexing: ${JSON.stringify(termIndexInfo)}`);
      return termIndexInfo;

    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }
}

// If we are running this module directly from Node this code will execute.
// This will index all terms taking our default input.
if (require.main === module) {
  const config = getConfig(process.env.NODE_ENV);
  let termsIndexer = new Indexer(config);

  termsIndexer.index()
    .then(termIndexInfo => termsIndexer.logger.info(`Finished indexing: ${JSON.stringify(termIndexInfo)}`))
    .catch(error => termsIndexer.logger.error(error));
}

module.exports = Indexer;
