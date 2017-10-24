const AbstractIndexer = require("../abstract_indexer");

class RepoIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "repo-indexer";
  }

  constructor(adapter, agencyEndpointsFile, params) {
    super(adapter, params);
    this.indexCounter = 0;
    this.agencyEndpointsFile = agencyEndpointsFile;
  }

  indexRepos(callback) {
    let rs = fs.createReadStream(this.agencyEndpointsFile);
    let js = JSONStream.parse("*");
    let as = new AgencyJsonStream();
    let is = new AgencyRepoIndexerStream();

    rs.pipe(js).pipe(as).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
      callback();
    });
  }

  static init(adapter, agencyEndpointsFile, callback) {
    let indexer = new RepoIndexer(adapter, agencyEndpointsFile, ES_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
    async.waterfall([
      (next) => {
        indexer.indexExists(next);
      },
      (exists, next) => {
        if(exists) {
          indexer.deleteIndex(next);
        } else {
          next(null, null);
        }
      },
      (response, next) => {
        indexer.initIndex(next);
      },
      (response, next) => {
        indexer.initMapping(next);
      },
      (response, next) => {
        indexer.indexRepos(next);
      },
      (next) => {
        Reporter.writeReportToFile(next);
      }
    ], (err) => {
      if(err) {
        indexer.logger.error(err);
      }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      return callback(err, {
        esIndex: indexer.esIndex,
        esAlias: indexer.esAlias
      });
    });
  }
}