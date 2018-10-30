const AbstractIndexer = require("../abstract_indexer");
const crypto = require("crypto");
const Logger = require('../../../utils/logger');

class StatusIndexer extends AbstractIndexer {
  get LOGGER_NAME() {
    return 'status-indexer';
  }

  constructor(adapter, params) {
    super(adapter, params);
    this.logger = new Logger( { name: this.LOGGER_NAME });
  }

  indexStatus (reporter) {
    const idHash = crypto.createHash('md5')
      .update(JSON.stringify(reporter.report), 'utf-8')
      .digest('hex');

    reporter.report.timestamp = (new Date()).toString();
    return this.indexDocument({
      index: this.esIndex,
      type: this.esType,
      id: idHash,
      document: JSON.stringify(reporter.report)
    });
  }

  static init(reporter, adapter, esParams) {
    const indexer = new StatusIndexer(adapter, esParams);

    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    return indexer.indexExists()
      .then(exists => {
        if(exists) {
          indexer.deleteIndex();
        }
      })
      .then(() => indexer.initIndex())
      .then(() => indexer.initMapping())
      .then(() => indexer.indexStatus(reporter))
      .then(() => {
        return { esIndex: indexer.esIndex, esAlias: indexer.esAlias };
      })
      .catch(error => {
        indexer.logger.error(error);
        throw error;
      });
  }
}

module.exports = StatusIndexer;
