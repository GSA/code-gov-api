const _ = require("lodash");
const Readable = require("stream").Readable;
const Logger = require("./logger");
const getConfig = require('../config');

let logger = new Logger({ name: "search-stream" });

class SearchLogger extends Logger {
  get LOGGER_NAME() {
    return 'search-stream';
  }
}
class SearchStream extends Readable {

  constructor(adapter, searchQuery) {
    super({ objectMode: true });
    const config = getConfig(process.env.NODE_ENV);

    this.client = new adapter({
      hosts: config.ES_HOST,
      logger: SearchLogger
    });

    this.searchQuery = searchQuery;
    this.logger = logger;
    this.from = 0;
    this.size = 100;
    this.current = -1;
  }

  _read() {
    // avoid making extra calls
    if (this.current === this.from) {
      return;
    }

    let searchQuery = _.merge(this.searchQuery, {
      "body": { "from": this.from, "size": this.size }
    });

    this.logger.debug(`Streaming search for:`, searchQuery);
    this.current = this.from;
    this.client.search({...searchQuery})
      .then(({ total, data}) => {
        if (total === 0) {
          return this.push(null);
        }

        this.from += data.length;

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
