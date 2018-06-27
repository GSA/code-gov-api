const moment = require("moment");
const Logger = require("../../utils/logger");

/* eslint-disable */
const ElasticSearch = require("elasticsearch");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}
/* eslint-enable */

class AbstractIndexer {

  get LOGGER_NAME() {
    return "abstract-indexer";
  }

  constructor(adapter, params) {
    const now = moment();
    const timestamp = now.format('YYYYMMDD_HHmmss');

    this.logger = new Logger({ name: this.LOGGER_NAME });
    this.client = adapter.getClient();
    this.esAlias = params.esAlias ? params.esAlias : undefined;

    this.esIndex = params.esIndex ? params.esIndex : this.esAlias ? this.esAlias + timestamp : undefined;
    this.esType = params.esType ? params.esType : undefined;
    this.esMapping = params.esMapping ? params.esMapping : undefined;
    this.esSettings = params.esSettings ? params.esSettings : undefined;
  }

  _toTitleCase(str) {
    return str.replace(/\w\S*/g,
      function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  deleteIndex() {
    this.logger.info(`Deleting index (${this.esIndex}).`);
    return new Promise((fulfill, reject) => {
      this.client.indices.delete({
        index: this.esIndex
      }, (err, response, status) => {
        if (err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(status);
          fulfill(response);
        }
      });
    });
  }

  initIndex() {
    this.logger.info(`Creating index (${this.esIndex}).`);
    return new Promise((fulfill, reject) => {
      this.client.indices.create({
        index: this.esIndex,
        body: this.esSettings
      }, (err, response, status) => {
        if(err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(status);
          fulfill(response);
        }
      });
    });
  }

  indexExists() {
    return new Promise((fulfill, reject) => {
      this.client.indices.exists({
        index: this.esIndex
      }, (err, response, status) => {
        if(err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(status);
          fulfill(response);
        }
      });
    });
  }

  indexDocument(doc) {
    return new Promise((fulfill, reject) => {
      this.client.index(doc, (err, response, status) => {
        if(err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(status);
          fulfill(response);
        }
      });
    });
  }

  initMapping() {
    this.logger.info(`Updating mapping for index (${this.esIndex}).`);

    return new Promise((fulfill, reject) => {
      this.client.indices.putMapping({
        index: this.esIndex,
        type: this.esType,
        body: this.esMapping
      }, (err, response, status) => {
        if(err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(status);
          fulfill(response);
        }
      });
    });
  }

  // implement this when extending
  static init(adapter, callback) {
    return callback();
  }

}

module.exports = AbstractIndexer;
