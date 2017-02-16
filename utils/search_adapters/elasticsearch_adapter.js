const ElasticSearch                 = require("elasticsearch");
const Logger                        = require("../logger");
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
    constructor() {
        super();

        let hosts = this.getHostsFromConfig();

        this.client = new ElasticSearch.Client({
            host: process.env.ES_HOST,
            httpAuth: process.env.ES_AUTH,
            log: SearchLogger
        });
    }
}

let exportedInstance = new ElasticsearchAdapter()
module.exports = exportedInstance;
