const async = require("async");
const getConfig = require("../../../config");
const RepoIndexer = require("../../../services/indexer/repo");
const AliasSwapper = require("../../../services/indexer/alias_swapper");
const IndexCleaner = require("../../../services/indexer/index_cleaner");
const IndexOptimizer = require("../../../services/indexer/index_optimizer");
const Logger = require("../../../utils/logger");
const ElasticsearchAdapter = require("../../../utils/search_adapters/elasticsearch_adapter");

const DAYS_TO_KEEP = process.env.DAYS_TO_KEEP || 2;

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
  constructor(config) {
    this.logger = new Logger({name: "repo-index-script"});
    this.config = config;
    this.elasticsearchAdapter = new ElasticsearchAdapter(this.config);
  }

  /**
   * Index the repos contained in the agency endpoints file
   */
  index(callback) {

    this.logger.info("Started indexing.");

    let repoIndexInfo = false;

    async.waterfall([
      (next) => {
        RepoIndexer.init(this.elasticsearchAdapter, this.config, next); 
      },
      (info, next) => {
        // save out alias and repo index name
        repoIndexInfo = info;
        return next(null);
      },
      // optimize the index
      (next) => {
        IndexOptimizer.init(this.elasticsearchAdapter, repoIndexInfo, next); 
      },
      // if all went well, swap aliases
      (next) => {
        AliasSwapper.init(this.elasticsearchAdapter, repoIndexInfo, next); 
      },
      // clean up old indices
      (next) => {
        IndexCleaner.init(this.elasticsearchAdapter, repoIndexInfo.esAlias, DAYS_TO_KEEP, next); 
      }
    ], (err, status) => {
      if (err) {
        this.logger.error(err);
      } else {
        this.logger.info("Finished indexing:", status);
      }
      return callback(err);
    });
  }
}

// If we are running this module directly from Node this code will execute.
// This will index all repos taking our default input.
if (require.main === module) {
  let indexer = new Indexer(getConfig(process.env.NODE_ENV));
  indexer.index((err) => {
    if (err) {
      indexer.logger.error(err);
    }
  });
}

module.exports = Indexer;
