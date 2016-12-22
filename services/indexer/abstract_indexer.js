const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");
const moment              = require("moment");

const Logger              = require("../../utils/logger");
const CONFIG              = require("../../config");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

class AbstractIndexer {

  get LOGGER_NAME() {
    return "abstract-indexer";
  }

  constructor(adapter, params) {
    this.logger = new Logger({ name: this.LOGGER_NAME });
    this.client = adapter.getClient();
    this.esAlias = params.esAlias;

    // index is based on time stamp
    // get timestamp to append to alias name
    var now = moment();
    let timestamp = now.format('YYYYMMDD_HHmmss');

    // Set the index name to be alias appended with a timestamp.
    this.esIndex = this.esAlias + timestamp;

    this.esType = params.esType;
    this.esMapping = params.esMapping;
    this.esSettings = params.esSettings;
  }

  _toTitleCase(str) {
    return str.replace(/\w\S*/g,
      function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  deleteIndex(callback) {
    this.logger.info(`Deleting index (${this.esIndex}).`);
    this.client.indices.delete({
      index: this.esIndex
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  initIndex(callback) {
    this.logger.info(`Creating index (${this.esIndex}).`);
    this.client.indices.create({
      index: this.esIndex,
      body: this.esSettings
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  indexExists(callback) {
    this.client.indices.exists({
      index: this.esIndex
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  indexDocument(doc, callback) {
    this.client.index(doc, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  initMapping(callback) {
    this.logger.info(`Updating mapping for index (${this.esIndex}).`);
    return this.client.indices.putMapping({
      index: this.esIndex,
      type: this.esType,
      body: this.esMapping
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  // implement this when extending
  static init(adapter, callback) {
    return callback();
  }

}

module.exports = AbstractIndexer;
