const async = require("async");
const Logger = require("../../utils/logger");
const _ = require('lodash');

/**
 * Class for Swapping out ElasticSearch Aliases
 *
 * @class AliasSwapper
 */
class AliasSwapper {

  get LOGGER_NAME() {
    return "alias-swapper";
  }

  /**
   * Creates an instance of AliasSwapper.
   *
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.logger = new Logger({ name: this.LOGGER_NAME});
  }

  async aliasExists({ name }) {
    try {
      return await this.adapter.aliasExists({ name });
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }

  }
  /**
   * Gets an array of indices that are associated with the alias
   *
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  async swapAlias(actions) {
    this.logger.info(`Swapping aliases.`);

    try {
      const results = await this.adapter.updateAliases({
        body: {
          actions: actions
        }
      })
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  async getIndexesForAlias({ alias }) {
    this.logger.info(`Getting indexes for alias (${alias}).`);
    let indices = [];

    try {
      const results = await this.adapter.getIndexesForAlias({ alias });
      _.forEach(results, function(item, key) {
        if (_.has(item, ['aliases', alias])) {
          indices.push(key);
        }
      });
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
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
        swapper.aliasExists(repoIndexInfo.esAlias)
          .then(exists => next(null, exists))
          .catch(error => next(error, null));
      },
      (exists, next) => {
        if(exists) {
          swapper.getIndexesForAlias({ alias: repoIndexInfo.esAlias })
            .then(indexesForAlias => next(null, indexesForAlias))
            .catch(error => next(error, null));
        } else {
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

        swapper.swapAlias(actions)
          .then(() => next(null))
          .catch(error => next(error, null));
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
