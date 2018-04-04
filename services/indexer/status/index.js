const AbstractIndexer = require("../abstract_indexer");
const crypto = require("crypto");

class StatusIndexer extends AbstractIndexer {
  get LOGGER_NAME() {
    return 'status-indexer';
  }

  constructor(adapter, params) {
    super(adapter, params);
  }

  indexStatus (reporter) {
    const idHash = crypto.createHash('md5')
      .update(JSON.stringify(reporter.report), 'utf-8')
      .digest('hex');

    reporter.report.timestamp = (new Date()).toString();
    return this.indexDocument({
      "index": this.esIndex,
      "type": this.esType,
      "id": idHash,
      "body": JSON.stringify(reporter.report)
    });
  }
}

module.exports = StatusIndexer;
