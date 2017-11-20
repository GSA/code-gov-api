const { Writable } = require("stream");
const Logger = require("../../../utils/logger");

const logger = new Logger({ name: 'repo-indexer-stream' });

class RepoIndexerStream extends Writable {
  constructor(indexer) {
    super({
      objectMode: true
    });
    this.indexer = indexer;
  }

  _indexRepo(repo) {
    return new Promise((fulfill, reject) => {
      // TODO: turn this call into a promise
      this.indexer.indexDocument({
        "index": this.indexer.esIndex,
        "type": this.indexer.esType,
        "id": repo.repoID,
        "body": repo
      })
      .then((response, status) => {
        if (status) {
          logger.debug('indexer.indexDocument - Status', status);
        }
        
        this.indexer.indexCounter++;
  
        fulfill(response);
      })
      .catch(err => {
        logger.error(err);
        reject(err);
      });
    });
  }

  _write(repo, enc, next) {
    this._indexRepo(repo)
      .then((response) => {
        logger.debug('_indexRepo promise fulfilled')
        return next(null, response);
      })
      .catch(err => {
        logger.error(err);
        return next(err, null);
      });
  }
}

module.exports = RepoIndexerStream;
