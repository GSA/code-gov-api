const _                   = require("lodash");
const Readable            = require("stream").Readable;
const Logger              = require("./logger");

let logger = new Logger({ name: "search-stream" });

class SearchStream extends Readable {

  constructor(adapter, searchQuery) {
    super({ objectMode: true });
    this.client = adapter.getClient();
    this.searchQuery = searchQuery;
    this.logger = logger;
    this.from = 0;
    this.current = -1;
  }

  _read() {
    // avoid making extra calls
    if (this.current === this.from) {
      return;
    }

    let searchQuery = _.merge(this.searchQuery, {
      "body": {
        "from": this.from
      }
    });
    this.logger.info(`Streaming search for:`, searchQuery);
    this.current = this.from;
    this.client.search(searchQuery, (err, res) => {
      if (err) {
        this.logger.error(err);
        return this.push(null);
      }

      if (!res.hits || !res.hits.hits || !res.hits.hits.length) {
        // no results
        return this.push(null);
      }

      let results = res.hits.hits.map((result) => {
        return result._source;
      });
      this.from += results.length;

      results.forEach((result) => {
        this.push(result);
      });
    });
  }

}

module.exports = SearchStream;
