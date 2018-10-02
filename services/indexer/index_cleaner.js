const async               = require("async");
const _                   = require("lodash");
const AbstractIndexTool   = require("./abstract_index_tool");
const Logger              = require("../../utils/logger");
const getConfig = require('../../config');
/* eslint-disable */
const ElasticSearch       = require("elasticsearch");
const ElasticsearchAdapter = require('../../utils/search_adapters/elasticsearch_adapter');
class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}
/* eslint-enable */

/**
 * Class for cleaning ElasticSearch Indexes
 *
 * @class IndexCleaner
 */
class IndexCleaner {

  get LOGGER_NAME() {
    return "index-cleaner";
  }

  /**
   * Creates an instance of IndexCleaner.
   *
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.logger = new Logger({ name: this.LOGGER_NAME });
  }

  /**
   * Gets a date in days since epoch
   *
   * @param {any} date
   * @returns
   */
  _toDays(date) {
    date = date || 0;
    let milli_in_days = 24 * 60 * 60 * 1000;

    return Math.floor(date / milli_in_days);
  }

  /**
   * Gets the indices that begin with an alias name that are older
   * than days to keep.
   *
   * @param {any} aliasName The alias to clean indices for.
   * @param {any} callback
   */
  async getIndices({ aliasName, daysToKeep=7 }) {
    this.logger.info(`Getting Indices for (${aliasName})`);
    try {
      const results = await this.adapter.getSettings({
        index: (aliasName + '*'),
        name: 'index.creation_date'
      });
      let indices = [];

      let currTime = this._toDays(Date.now());
      let cutoffTime = currTime - daysToKeep;

      _.forEach(results, (value, key) => {
        let index_date = this._toDays(value["settings"]["index"]["creation_date"]);
        if (index_date < cutoffTime) {
          indices.push(key);
        }
      });

      return indices;
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  /**
   * Removes any indices from a list that are associated with a specific alias.
   *
   * @param {any} aliasName The alias to check
   * @param {any} indices A list of indices to filter
   * @param {any} callback
   */
  async filterAliasedIndices({ aliasName, indices=[] }) {
    try {
      const results = this.adapter.getIndexForAlias({ alias: aliasName });
      return _.difference(indices, results);
    } catch (error) {
      this.logger.trace(error);
      throw error;
    }
  }

  /**
   * Deletes a list of indices from ElasticSearch
   *
   * @param {any} indices
   * @param {any} callback
   */
  async deleteIndices(indices) {
    try {
      const results = await this.adapter.deleteIndex({
        index: indices,
        requestTimeout: 90000
      });

      return results;

    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  /**
   * Performs all the steps to clean a single alias
   *
   * @param {any} aliasName
   * @param {any} callback
   */
  async cleanIndicesForAlias(aliasName, daysToKeep) {
    return this.getIndices({ aliasName, daysToKeep })
      .then(indices => this.filterAliasedIndices({ aliasName, indices}))
      .then(indices => {
        if(indices.length > 0) {
          return this.deleteIndices(indices);
        }
      })
      .catch(error => {
        this.logger.trace(error);
        throw error;
      });
  }

  /**
   * Initializes and executes the cleaning of old repo indices
   *
   * This will remove all indicies greater than 'daysToKeep' old that
   * begin with the alias names supplied index the repoIndexInfo
   * objects.  NOTE: This will not remove indicies associated
   * with either alias regardless of age.
   *
   * @static
   * @param {any} adapter The search adapter to use for making requests to ElasticSearch
   * @param {any} repoAlias The alias name for clinical repos
   * @param {any} daysToKeep The number of days of indices to keep.
   * @param {any} callback
   */
  static init(adapter, repoAlias, daysToKeep) {

    let cleaner = new IndexCleaner(adapter);
    cleaner.logger.info(`Starting index cleaning.`);

    return cleaner.cleanIndicesForAlias(repoAlias, daysToKeep);
  }
}

if (require.main === module) {
  const reposAlias = 'repos';
  const numDays = 10;
  const elasticsearchAdapter = new ElasticsearchAdapter(getConfig(process.env.NODE_ENV));

  IndexCleaner.init(elasticsearchAdapter, reposAlias, numDays)
    .then(() => Logger.info("Cleaning Completed."))
    .catch(error => {
      Logger.trace("Errors Occurred: " + error);
    });
}

module.exports = IndexCleaner;
