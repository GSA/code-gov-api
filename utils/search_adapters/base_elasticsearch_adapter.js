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

  getHostsFromConfig() {
    let hosts = [];

    if (Array.isArray(this.config.ES_HOST)) {
      this.config.ES_HOST.forEach(url => {
        hosts.push(url);
      });
    } else {
      hosts.push(this.config.ES_HOST);
    }

    return hosts;
  }
}

module.exports = BaseElasticsearchAdapter;
