const request             = require("request");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Readable;
const JSONStream          = require("JSONStream");
const moment              = require("moment");

const Logger              = require("./logger");

let logger = new Logger({ name: "search-stream" });

class SearchStream extends Readable {

  constructor(adapter, searchQuery) {
    super({ objectMode: true });
    this.client = adapter.getClient();
    this.searchQuery = searchQuery;
    this.logger = logger;
    this.from = 0;
  }

  _read() {
    let searchQuery = _.merge(this.searchQuery, {
      "body": {
        "from": this.from
      }
    });
    this.logger.info(`Streaming search for ${searchQuery}...`);
    this.client.searchQuery(searchQuery, (err, res) => {
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
      this.push(results);
      this.from += results.length;
    });
  }

}
