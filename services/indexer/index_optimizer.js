const Logger = require("../../utils/logger");

/**
 * Class for optimizing ElasticSearch Indexes
 *
 * @class IndexOptimizer
 */
class IndexOptimizer {

  /**
   * Creates an instance of AliasSwapper.
   *
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter, config) {
    this.adapter = new adapter({
      hosts: config.ES_HOST,
      logger: Logger
    });
    this.logger = new Logger({ name: 'index-optimizer'});
  }

  /**
   * Optimizes (forceMerge) an index into 1 segment so that
   * all elasticsearch servers return the same scores for
   * searches.
   *
   * @param {any} indexName The index to optimize.
   */
  async forceMerge(indexName) {
    this.logger.info(`Optimizing Index (${indexName})`);

    try {
      await this.adapter.forceMerge({
        maxNumSegments: 1,
        index: indexName,
        requestTimeout: 90000
      });
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  /**
   * Initializes and executes the optimizing of for repos
   *
   * @static
   * @param {any} adapter The search adapter to use for making requests to ElasticSearch
   * @param {any} repoIndexInfo Information about the index and alias for repos
   * @param {any} callback
   */
  static async init(adapter, repoIndexInfo, config) {

    let optimizer = new IndexOptimizer(adapter, config);
    optimizer.logger.info(`Starting index optimization.`);
    try {
      await optimizer.forceMerge(repoIndexInfo.esIndex);
      optimizer.logger.info(`Finished optimizing indices.`);
    } catch(error) {
      optimizer.logger.trace(error);
      throw error;
    }

  }

}

module.exports = IndexOptimizer;
