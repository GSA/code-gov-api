const Logger = require("../../utils/logger");

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
  constructor(adapter, config) {
    this.adapter = new adapter({
      hosts: config.ES_HOST,
      logger: Logger
    });
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
      return await this.adapter.updateAliases({
        body: {
          actions: actions
        }
      });
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  async getIndexesForAlias({ alias }) {
    this.logger.info(`Getting indexes for alias (${alias}).`);

    try {
      return await this.adapter.getIndexesForAlias({ alias });
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  /**
   * Build actions for the alias swapper.
   * @param {*} param
   * @param {Array} param.indices A collection of indices to remove an alias from.
   * @param {object} param.repoIndexInfo The information of the index being created.
   * @returns {Array} Array with all actions to be perfomed by the alias swapper.
   */
  _buildActions({ indices, repoIndexInfo }) {
    let actions = [];
    for(let index of indices) {
      actions.push({
        "remove": {
          "index": index,
          "alias": repoIndexInfo.esAlias
        }
      });
    }
    actions.push({
      "add": {
        "index": repoIndexInfo.esIndex,
        "alias": repoIndexInfo.esAlias
      }
    });
    return actions;
  }

  /**
   * Initializes and executes the swapping of aliases for repos
   *
   * @static
   * @param {object} adapter The search adapter to use for making requests to ElasticSearch
   * @param {object} repoIndexInfo Information about the index and alias for repos
   */
  static async init(adapter, repoIndexInfo, config) {

    let swapper = new AliasSwapper(adapter, config);
    swapper.logger.info(`Starting alias swapping.`);
    try {
      const exists = await swapper.aliasExists({ name: repoIndexInfo.esAlias });
      let indices = [];

      if(exists) {
        indices = await swapper.getIndexesForAlias({ alias: repoIndexInfo.esAlias });
      }
      let actions = swapper._buildActions({ indices, repoIndexInfo });

      return await swapper.swapAlias(actions);

    } catch(error) {
      swapper.logger.trace(error);
      throw error;
    }
  }
}

module.exports = AliasSwapper;
