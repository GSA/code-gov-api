const async               = require("async");
const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");

const AbstractIndexTool   = require("./abstract_index_tool");
const Logger              = require("../../utils/logger");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

/**
 * Class for optimizing ElasticSearch Indexes
 *
 * @class AliasSwapper
 */
class IndexOptimizer extends AbstractIndexTool {

  get LOGGER_NAME() {
    return "index-optimizer";
  }

  /**
   * Creates an instance of AliasSwapper.
   *
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter) {
    super(adapter);
  }

  /**
   * Optimizes (forceMerge) an index into 1 segment so that
   * all elasticsearch servers return the same scores for
   * searches.
   *
   * @param {any} indexName The index to optimize.
   * @param {any} callback
   */
  forceMerge(indexName, callback) {
    this.logger.info(
      `Optimizing Index (${indexName})`);
    this.client.indices.forcemerge({
        maxNumSegments: 1,
        index: indexName,
        requestTimeout: 90000
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  /**
   * Initializes and executes the optimizing of for repos
   *
   * @static
   * @param {any} adapter The search adapter to use for making requests to ElasticSearch
   * @param {any} repoIndexInfo Information about the index and alias for repos
   * @param {any} callback
   */
  static init(adapter, repoIndexInfo, callback) {

    let optimizer = new IndexOptimizer(adapter);
    optimizer.logger.info(`Starting index optimization.`);

    optimizer.forceMerge(repoIndexInfo.esIndex, (err) => {
      if(err) { optimizer.logger.error(err); }
      optimizer.logger.info(`Finished optimizing indices.`);
      return callback(err);
    });

  }

}

module.exports = IndexOptimizer;
