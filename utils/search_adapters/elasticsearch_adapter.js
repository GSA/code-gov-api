const ElasticSearch                 = require("elasticsearch");
const Logger                        = require("../logger");
// TODO: The use of the BaseElasticsearchAdapter might not be needed.
const BaseElasticsearchAdapter      = require("./base_elasticsearch_adapter");
/**
 * A logger to be used by ElasticSearch
 *
 * @class SearchLogger
 * @extends {Logger}
 */
class SearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "adapter-elasticsearch";
  }
}

/**
 * Represents the client that should be used for connecting to Elasticsearch
 *
 * @class ElasticsearchAdapter
 * @extends {AbstractElasticsearchAdapter}
 */
class ElasticsearchAdapter extends BaseElasticsearchAdapter {

  /**
     * Creates an instance of ElasticsearchAdapter.
     *
     */
  constructor(config) {
    super(config);

    this.client = new ElasticSearch.Client({
      hosts: this.getHostsFromConfig(),
      log: SearchLogger
    });
  }
}

module.exports = ElasticsearchAdapter;
