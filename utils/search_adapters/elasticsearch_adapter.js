const ElasticSearch                 = require("elasticsearch");
const Logger                        = require("../logger");
const BaseElasticsearchAdapter      = require("./base_elasticsearch_adapter"); // TODO: The use of the BaseElasticsearchAdapter might not be needed.
const CONFIG                        = require("../../config");
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
  constructor() {
    super();

    this.client = new ElasticSearch.Client({
      host: `${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`,
      httpAuth: CONFIG.ES_AUTH,
      log: SearchLogger
    });
  }
}

let exportedInstance = new ElasticsearchAdapter();
module.exports = exportedInstance;
