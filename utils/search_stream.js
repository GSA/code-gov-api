const _                   = require("lodash");
const Readable            = require("stream").Readable;
const Logger              = require("./logger");

let logger = new Logger({ name: "search-stream" });

class SearchStream extends Readable {

  constructor(adapter, searchQuery) {
    super({ objectMode: true });
    this.client = adapter;
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
      "body": { "from": this.from }
    });

    this.logger.debug(`Streaming search for:`, searchQuery);
    this.current = this.from;
    this.client.search({...searchQuery})
      .then(({ total, data}) => {
        if (response.total === 0) {
          return this.push(null);
        }

        this.from += total;

        data.forEach((item) => {
          this.push(item);
        });
      })
      .catch(error => {
        this.logger.error(error);
        return this.push(null);
      });
  }
}


module.exports = SearchStream;
