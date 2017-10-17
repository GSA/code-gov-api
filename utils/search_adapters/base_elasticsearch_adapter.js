const CONFIG                        = require("../../config");
const AbstractSearchAdapter         = require("./abstract_search_adapter");

/**
 * Represents a base adapter for ES connections that can handle the config.
 *
 * @class BaseElasticsearchAdapter
 * @extends {AbstractSearchAdapter}
 */
class BaseElasticsearchAdapter extends AbstractSearchAdapter {

  /**
     * Creates an instance of SearcherESClient.
     *
     */
  constructor() {
    super();
  }

  //TODO: We might be able to eliminate all this code and the AbstractSearchAdapter. Something to think about
  getHostsFromConfig() {
    let hosts = [];

    if (Array.isArray(CONFIG.ES_HOST)) {
      CONFIG.ES_HOST.forEach(host => {
        hosts.push(`${host}:${CONFIG.ES_PORT}`);
      });
    } else {
      hosts.push(`${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`);
    }

    return hosts;
  }
}

module.exports = BaseElasticsearchAdapter;
