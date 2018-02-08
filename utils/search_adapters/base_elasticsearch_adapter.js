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
  constructor(config) {
    super();
    this.config = config;
  }

  //TODO: We might be able to eliminate all this code and the AbstractSearchAdapter. Something to think about
  getHostsFromConfig() {
    let hosts = [];

    if (Array.isArray(this.config.ES_HOST)) {
      this.config.ES_HOST.forEach(host => {
        hosts.push(`${host}:${this.config.ES_PORT}`);
      });
    } else {
      hosts.push(`${this.config.ES_HOST}:${this.config.ES_PORT}`);
    }

    return hosts;
  }
}

module.exports = BaseElasticsearchAdapter;
