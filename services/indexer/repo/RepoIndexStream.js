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
      }, (err, response, status) => {
        if(err) {
          this.logger.error(err);
          reject(err);
        } else {
          if (status) {
            this.logger.debug('Status', status);
          }
          this.repoIndexer.indexCounter++;
    
          fulfill({status, response});
        }
      });
    });
  }

  _write(repo, enc, next) {
    this._indexRepo(repo)
      .then((status, response) => {
        return next(null, response);
      })
      .catch(err => {
        this.logger.error(err);
        return next(err, null);
      });
  }
}

module.exports = RepoIndexerStream;
