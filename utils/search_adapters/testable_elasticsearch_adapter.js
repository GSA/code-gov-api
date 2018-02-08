const BaseElasticsearchAdapter      = require("./base_elasticsearch_adapter");

/**
 * Represents the client that should be used for integration tests.
 * The adapter creates a MockClient which reads and stores the received
 * queries and pre-defined responses from the Adapter.
 * (We use the adapter as the store since it's the interface used
 * by the app and the tests, and clients may be recreated.)
 * 
 * @class ElasticsearchAdapter
 * @extends {BaseElasticsearchAdapter}
 */
class TestableElasticsearchAdapter extends BaseElasticsearchAdapter {

  /**
   * Sets up variables for recording the query and delivering
   * an expected error value and response.
   */
  constructor() {
    super();
    this.searchArgs = null;
    this.response = null;
    this.error = null;
  }

  setResponse(response) {
    this.response = response;
  }

  setError(error) {
    this.error = error;
  }

  getClient() {
    return new MockClient(this);
  }

  getSearchArgs() {
    return this.searchArgs;
  }
}

class MockClient {

  /**
   * Hang onto the adapter reference so that we can get/set
   * queries and responses.
   */
  constructor(adapter) {
    this.adapter = adapter;
  }

  /**
   * Records query arguments, then sends the previously-set 
   * error and response to the callback.
   */
  search(args, callback) {
    this.adapter.searchArgs = args;
    callback(this.adapter.error, this.adapter.response);
  }

  index(doc, callback) {
    // Should return a mock response from elasticsearch ...
    this.adapter.indexedDoc = doc;
    callback(this.adapter.error, this.adapter.response);
  }
}

module.exports = TestableElasticsearchAdapter;
