const getConfig = require("../../../config");
const RepoIndexer = require("../../../services/indexer/repo");
const AliasSwapper = require("../../../services/indexer/alias_swapper");
const IndexCleaner = require("../../../services/indexer/index_cleaner");
const IndexOptimizer = require("../../../services/indexer/index_optimizer");
const Logger = require("../../../utils/logger");
const adapters = require('@code.gov/code-gov-adapter');
const { normalizeRepoScores } = require('../../../services/indexer/repo/dataScoreNormalizer');
const { getGithubData } = require('../../../services/indexer/repo/githubData');

const DAYS_TO_KEEP = process.env.DAYS_TO_KEEP || 2;
class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

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
    this.logger = new Logger({ name: 'repo-index-script', level: config.LOGGER_LEVEL });
    this.config = config;

    this.elasticsearchAdapter = adapters.elasticsearch.ElasticsearchAdapter;
  }

  /**
   * Index the repos contained in the agency endpoints file
   */
  async index() {

    this.logger.info('Started indexing.');

    try {
      const repoIndexInfo = await RepoIndexer.init(this.elasticsearchAdapter, this.config);
      await normalizeRepoScores(this.elasticsearchAdapter, repoIndexInfo);
      await getGithubData(this.elasticsearchAdapter, repoIndexInfo);
      await IndexOptimizer.init(this.elasticsearchAdapter, repoIndexInfo, this.config);
      await AliasSwapper.init(this.elasticsearchAdapter, repoIndexInfo, this.config);
      await IndexCleaner.init(this.elasticsearchAdapter, repoIndexInfo.esAlias, DAYS_TO_KEEP, this.config);

      this.logger.debug(`Finished indexing repos`);
      return repoIndexInfo;
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }
}

// If we are running this module directly from Node this code will execute.
// This will index all repos taking our default input.
if (require.main === module) {
  let indexer = new Indexer(getConfig(process.env.NODE_ENV));
  indexer.index()
    .then(() => indexer.logger.debug(`Finished indexing repos`))
    .catch(error => indexer.logger.error(error));
}

module.exports = Indexer;
