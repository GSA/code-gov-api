const getConfig = require("../../../config");
const RepoIndexer = require("../../../services/indexer/repo");
const AliasSwapper = require("../../../services/indexer/alias_swapper");
const IndexCleaner = require("../../../services/indexer/index_cleaner");
const IndexOptimizer = require("../../../services/indexer/index_optimizer");
const Logger = require("../../../utils/logger");
const adapters = require('@code.gov/code-gov-adapter');

const DAYS_TO_KEEP = process.env.DAYS_TO_KEEP || 2;
class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

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
    this.logger = new Logger({name: "repo-index-script"});
    this.config = config;

    this.elasticsearchAdapter = new adapters.elasticsearch.ElasticsearchAdapter({
      hosts: this.config.ES_HOST,
      logger: ElasticSearchLogger
    });
  }

  /**
   * Index the repos contained in the agency endpoints file
   */
  index(callback) {

    this.logger.info("Started indexing.");

    RepoIndexer.init(this.elasticsearchAdapter, this.config, async (error, info) => {
      if(error) {
        this.logger.error(error);
        callback(error);
      }

      try {
        await IndexOptimizer.init(this.elasticsearchAdapter, info);
        await AliasSwapper.init(this.elasticsearchAdapter, info);
        await IndexCleaner.init(this.elasticsearchAdapter, info.esAlias, DAYS_TO_KEEP);

        this.logger.info(`Finished indexing repos`);

        callback(null)
      } catch(error) {
        this.logger.error(error);
        callback(error);
      }
    });
  }
}

// If we are running this module directly from Node this code will execute.
// This will index all repos taking our default input.
if (require.main === module) {
  let indexer = new Indexer(getConfig(process.env.NODE_ENV));
  indexer.index((err) => {
    if (err) {
      indexer.logger.error(err);
    }
  });
}

module.exports = Indexer;
