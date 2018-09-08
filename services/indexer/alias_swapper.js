const async               = require("async");
const AbstractIndexTool   = require("./abstract_index_tool");
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
 * Class for Swapping out ElasticSearch Aliases
 *
 * @class AliasSwapper
 */
class AliasSwapper extends AbstractIndexTool {

  get LOGGER_NAME() {
    return "alias-swapper";
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
   * Gets an array of indices that are associated with the alias
   *
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  swapAlias(actions, callback) {
    this.logger.info(
      `Swapping aliases.`);
    this.client.indices.updateAliases({
      body: {
        actions: actions
      }
    }, (err, response, status) => {
      if(err) {
        this.logger.error(err);
      }
      if (status) {
        this.logger.debug('Status', status);
      }
      return callback(err, response);
    });
  }

  /**
   * Initializes and executes the swapping of aliases for repos
   *
   * @static
   * @param {any} adapter The search adapter to use for making requests to ElasticSearch
   * @param {any} repoIndexInfo Information about the index and alias for repos
   * @param {any} callback
   */
  static init(adapter, repoIndexInfo, callback=undefined) {

    let swapper = new AliasSwapper(adapter);
    swapper.logger.info(`Starting alias swapping.`);

    //Find out who is using aliases

    async.waterfall([
      //Get indexes for repo alias
      (next) => {
        swapper.aliasExists(repoIndexInfo.esAlias, next);
      },
      (exists, next) => {
        if(exists) {
          swapper.getIndexesForAlias(repoIndexInfo.esAlias, next);
        } else {
          //Empty Array of Indexes used by Alias
          next(null, []);
        }
      },
      (indexesForAlias, next) => {
        repoIndexInfo.currentAliasIndexes = indexesForAlias;
        next(null);
      },
      // Build the removal and addions.
      (next) => {

        let actions = [];

        // Loop over the repo indexes and setup the add/removes for this swap.
        [repoIndexInfo].forEach(indexType => {
          indexType.currentAliasIndexes.forEach((index) => {
            actions.push({
              "remove": {
                "index": index,
                "alias": indexType.esAlias
              }
            });
          });
          actions.push({
            "add": {
              "index": indexType.esIndex,
              "alias": indexType.esAlias
            }
          });
        });

        swapper.swapAlias(actions, next);
      }
    ], (err) => {
      if(err) {
        swapper.logger.error(err);
      }
      swapper.logger.info(`Finished swapping aliases.`);
      if(callback && typeof callback === 'function'){
        return callback(err);
      }
    });
  }

}

module.exports = AliasSwapper;
