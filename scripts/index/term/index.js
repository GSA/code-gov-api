const async                 = require("async");
const TermIndexer           = require("../../../services/indexer/term");
const AliasSwapper          = require("../../../services/indexer/alias_swapper");
const IndexCleaner          = require("../../../services/indexer/index_cleaner");
const IndexOptimizer        = require("../../../services/indexer/index_optimizer");
const Logger                = require("../../../utils/logger");
const elasticsearchAdapter  = require("../../../utils/search_adapters/elasticsearch_adapter");

const DAYS_TO_KEEP = 7;

/**
 * Defines the class responsible for creating and managing the elasticsearch indexes
 *
 * @class Indexer
 */
class Indexer {

  /**
   * Creates an instance of Indexer.
   *
   */
  constructor() {
    this.logger = new Logger({name: "term-index-script"});
  }

  /**
   * Index the terms contained in the repos core
   */
  index(callback) {

    this.logger.info("Started indexing.");

    let termIndexInfo = false;

    async.waterfall([
      (next) => {
        TermIndexer.init(elasticsearchAdapter, next); 
      },
      (info, next) => {
        // save out alias and term index name
        termIndexInfo = info;
        return next(null);
      },
      // optimize the index
      (next) => {
        IndexOptimizer.init(elasticsearchAdapter, termIndexInfo, next); 
      },
      // if all went well, swap aliases
      (next) => {
        AliasSwapper.init(elasticsearchAdapter, termIndexInfo, next); 
      },
      // clean up old indices
      (next) => {
        IndexCleaner.init(elasticsearchAdapter, termIndexInfo.esAlias, DAYS_TO_KEEP, next); 
      }
    ], (err, status) => {
      if (err) {
        this.logger.info("Errors encountered. Exiting.");
      } else {
        this.logger.info("Finished indexing", status);
      }
      return callback(err);
    });
  }
}

// If we are running this module directly from Node this code will execute.
// This will index all terms taking our default input.
if (require.main === module) {
  let indexer = new Indexer();
  indexer.index((err) => {
    if (err) {
      indexer.logger.error(err);
    }
  });
}

module.exports = Indexer;
