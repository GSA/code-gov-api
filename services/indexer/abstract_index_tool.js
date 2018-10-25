const _                   = require("lodash");
const Logger              = require("../../utils/logger");
/* eslint-disable */
const ElasticSearch       = require("elasticsearch");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}
/* eslint-enable */

/**
 * Base Class for Index Tools.  This will allow us to share common ES functions
 * across tools used in the indexing process.
 *
 * @class AliasSwapper
 */
class AbstractIndexTool {

  get LOGGER_NAME() {
    return "alias-swapper";
  }

  /**
   * Creates an instance of AliasSwapper.
   *
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter) {
    this.logger = new Logger({name: this.LOGGER_NAME});

    this.client = adapter;
  }

  /**
   * Gets an array of indices that are associated with the alias
   *
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  getIndexesForAlias(aliasName, callback) {
    this.logger.info(
      `Getting indexes for alias (${aliasName}).`);
    this.client.indices.getAlias({
      name: aliasName
    }, (err, response, status) => {
      let indices = new Array();
      if(err) {
        this.logger.error(err);
      } else {
        if (status) {
          this.logger.debug('Status', status);
        }
        _.forEach(response, function(item, key) {
          if (_.has(item, ['aliases', aliasName])) {
            indices.push(key);
          }
        });
      }
      return callback(err, indices);
    });
  }

  /**
   * Gets an array of indices that are associated with the alias
   *
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  aliasExists(aliasName, callback) {
    this.logger.info(
      `Checking existance of alias (${aliasName}).`);
    this.client.indices.existsAlias({
      name: aliasName
    }, (err, response, status) => {
      if (err) {
        this.logger.error(err);
      }
      if (status) {
        this.logger.debug('Status', status);
      }
      return callback(err, response);
    });
  }

  /**
   * Initializes and executes the swapping of aliases for trials and terms
   *
   * @static
   * @param {any} adapter The search adapter to use for making requests to ElasticSearch
   * @param {any} trialIndexInfo Information about the index and alias for trials
   * @param {any} termIndexInfo Information about the index and alias for terms
   * @param {any} callback
   */
  // IMPLEMENT THIS
  static init(adapter, trialIndexInfo, termIndexInfo, callback) {
    return callback();
  }

}

module.exports = AbstractIndexTool;
