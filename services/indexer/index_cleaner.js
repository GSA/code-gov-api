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
 * Class for cleaning ElasticSearch Indexes
 *
 * @class IndexCleaner
 */
class IndexCleaner extends AbstractIndexTool {

  get LOGGER_NAME() {
    return "index-cleaner";
  }

  /**
   * Creates an instance of IndexCleaner.
   *
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter) {
      super(adapter);
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
  getIndices(aliasName, daysToKeep, callback) {
    this.logger.info(
      `Getting Indices for (${aliasName})`);


    this.client.indices.getSettings({
        index: (aliasName + '*'),
        name: 'index.creation_date', //Only get creation date field
        flatSettings: true
    }, (err, response, status) => {
      if(err) {
          this.logger.error(err);
          return callback(err, false);
      } else {
          let indices = [];

          let currTime = this._toDays(Date.now());
          let cutoffTime = currTime - daysToKeep;

          _.forEach(response, (value, key) => {
              let index_date = this._toDays(value.settings["index.creation_date"]);
              if (index_date < cutoffTime) {
                indices.push(key);
              }
          });

          return callback(false, indices)
      }
    });
  }

  /**
   * Removes any indices from a list that are associated with a specific alias.
   *
   * @param {any} aliasName The alias to check
   * @param {any} indices A list of indices to filter
   * @param {any} callback
   */
  filterAliasedIndices(aliasName, indices, callback) {
      this.getIndexesForAlias(aliasName, (err, aliasIndices) => {
          if (err) { return callback(err, false); }

          return callback(false, _.difference(indices, aliasIndices));
      });
  }

  /**
   * Deletes a list of indices from ElasticSearch
   *
   * @param {any} indices
   * @param {any} callback
   */
  deleteIndices(indices, callback) {
    this.client.indices.delete({
        index: indices,
        requestTimeout: 90000
    }, (err, response, status) => {
        return callback(err);
    });
  }

  /**
   * Performs all the steps to clean a single alias
   *
   * @param {any} aliasName
   * @param {any} callback
   */
  cleanIndicesForAlias(aliasName, daysToKeep, callback) {

    async.waterfall([
      (next) => { this.getIndices(aliasName, daysToKeep, next); }, //Gets all indices older than 7 days
      (oldIndices, next) => { this.filterAliasedIndices(aliasName, oldIndices, next); },
      (filteredIndices, next) => {
          if (filteredIndices.length > 0) {
            this.deleteIndices(filteredIndices, next);
          } else {
            next(false);
          }
        }
    ], (err) => {
      if(err) { this.logger.error(err); }
      this.logger.info(`Finished cleaning indices for: (${aliasName}).`);
      return callback(err);
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
  static init(adapter, repoAlias, daysToKeep, callback) {

    let cleaner = new IndexCleaner(adapter);
    cleaner.logger.info(`Starting index cleaning.`);

    cleaner.cleanIndicesForAlias(repoAlias, daysToKeep, (err) => {
      if(err) { cleaner.logger.error(err); }
      cleaner.logger.info(`Finished cleaning indices.`);
      return callback(err);
    });

  }
}

// If we are running this module directly from Node this code will execute.
// This will index all repos taking our default input.
if (require.main === module) {
  //TODO: Make parameters
  reposAlias = 'repos';
  numDays = 10;

  const ElasticsearchAdapter = require('../../utils/search_adapters/elasticsearch_adapter');

  IndexCleaner.init(ElasticsearchAdapter, reposAlias, numDays, (err)=> {
      if (err) {
          console.log("Errors Occurred: " + err);
      } else {
          console.log("Cleaning Completed.");
      }
  });
}

module.exports = IndexCleaner;
