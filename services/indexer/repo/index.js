const fs = require("fs");
const JSONStream = require("JSONStream");
const Reporter = require("../../reporter");
const AbstractIndexer = require("../abstract_indexer");

const AgencyJsonStream = require("../repo/AgencyJsonStream");
const RepoIndexerStream = require("../repo/RepoIndexStream");
const ES_MAPPING = require("../../../indexes/repo/mapping.json");

const ES_SETTINGS = require("../../../indexes/repo/settings.json");
const ES_PARAMS = {
  "esAlias": "repos",
  "esType": "repo",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

class RepoIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "repo-indexer";
  }

  constructor({adapter, agencyEndpointsFile, fetchedFilesDir, fallbackFilesDir=null, params}) {
    super(adapter, params);
    this.indexCounter = 0;
    this.agencyEndpointsFile = agencyEndpointsFile;
    this.fetchedFilesDir = fetchedFilesDir;
    this.fallbackFilesDir = fallbackFilesDir;

  }

  indexRepos(config) {
    const agencyEndpointsStream = fs.createReadStream(this.agencyEndpointsFile);
    const jsonStream = JSONStream.parse("*");
    const agencyJsonStream = new AgencyJsonStream(this.fetchedFilesDir, this.fallbackFilesDir, config);
    const indexerStream = new RepoIndexerStream(this);

    return new Promise((fulfill, reject) => {
      agencyEndpointsStream
        .pipe(jsonStream)
        .on("error", (error) => {
          reject(error);
        })
        .pipe(agencyJsonStream)
        .on("error", (error) => {
          reject(error);
        })
        .pipe(indexerStream)
        .on("error", (error) => {
          reject(error);
        })
        .on("finish", () => {
          const finishedMsg = `Indexed ${this.indexCounter} ${this.esType} documents.`;
          this.logger.info(finishedMsg);
          fulfill(finishedMsg);
        });
    });
  }

  static async init(adapter, config) {
    const params = {
      esHosts: config.ES_HOST,
      ...ES_PARAMS
    }
    const repoIndexer = new RepoIndexer({
      adapter,
      agencyEndpointsFile: config.AGENCY_ENDPOINTS_FILE,
      fetchedFilesDir: config.FETCHED_DIR,
      fallbackFilesDir: config.FALLBACK_DIR,
      params
    });

    repoIndexer.logger.info(`Started indexing (${repoIndexer.esType}) indices.`);

    try {
      const exists = await repoIndexer.indexExists();
      if(exists) {
        await repoIndexer.deleteIndex();
      }
      await repoIndexer.initIndex();
      await repoIndexer.initMapping();
      await repoIndexer.indexRepos(config);
      await Reporter.indexReport(config);

      repoIndexer.logger.info(`Finished indexing (${repoIndexer.esType}) indices.`);
      return {
        esAlias: repoIndexer.esAlias,
        esIndex: repoIndexer.esIndex,
        esType: repoIndexer.esType,
        esMapping: repoIndexer.esMapping,
        esSettings: repoIndexer.esSettings
      };
    } catch(error) {
      repoIndexer.logger.error(error);
      throw error;
    }
  }
}

module.exports = RepoIndexer;
