const { Writable } = require("stream");

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
          this.indexer.logger.debug('Status', status);
        }
        this.indexer.indexCounter++;
  
        fulfill(response);
      })
      .catch(err => {
        this.indexer.logger.error(err);
        reject(err);
      });
    });
  }

  _write(repo, enc, next) {
    this._indexRepo(repo)
      .then((response) => {
        return next(null, response);
      })
      .catch(err => {
        this.indexer.logger.error(err);
        return next(err, null);
      });
  }
}

module.exports = RepoIndexerStream;
