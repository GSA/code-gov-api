const async                 = require("async");
const path                  = require("path");
const config                = require("../../config");
const RepoIndexer           = require("../../services/indexer/repo");
const AliasSwapper          = require("../../services/indexer/alias_swapper");
const IndexCleaner          = require("../../services/indexer/index_cleaner");
const IndexOptimizer        = require("../../services/indexer/index_optimizer");
const Logger                = require("../../utils/logger");
const elasticsearchAdapter  = require("../../utils/search_adapters/elasticsearch_adapter");

const DAYS_TO_KEEP = 7;
const AGENCY_ENDPOINTS_FILE = path.join(__dirname, "../../", config.AGENCY_ENDPOINTS_FILE);

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
    this.logger = new Logger({name: "indexer"});
  }

  /**
   * Index the trials contained in the trials file
   */
  index() {

    this.logger.info("Started indexing.");

    let repoIndexInfo = false;

    async.waterfall([
      (next) => { RepoIndexer.init(elasticsearchAdapter, AGENCY_ENDPOINTS_FILE, next); },
      (info, next) => {
        // save out alias and trial index name
        repoIndexInfo = info;
        return next(null);
      },
      // optimize the index
      (next) => { IndexOptimizer.init(elasticsearchAdapter, repoIndexInfo, next); },
      // if all went well, swap aliases
      (next) => { AliasSwapper.init(elasticsearchAdapter, repoIndexInfo, next); },
      // clean up old indices
      (next) => { IndexCleaner.init(elasticsearchAdapter, repoIndexInfo.esAlias, DAYS_TO_KEEP, next); }
    ], (err, status) => {
      if (err) {
        this.logger.info("Errors encountered. Exiting.");
      } else {
        this.logger.info("Finished indexing.");
      }
    });
  }
}

// If we are running this module directly from Node this code will execute.
// This will index all trials taking our default input.
if (require.main === module) {
  let indexer = new Indexer();
  indexer.index(AGENCY_ENDPOINTS_FILE);
}

module.exports = Indexer;
