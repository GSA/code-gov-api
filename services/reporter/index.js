/******************************************************************************

  REPORTER: a service which tracks the status of fetching/indexing and writes
  a report as a result

******************************************************************************/

const Jsonfile = require("jsonfile");
const Logger = require("../../utils/logger");
const getConfig = require("../../config");
const StatusIndexer = require("../indexer/status");
const adapters = require('@code.gov/code-gov-adapter');
const elasticsearchMappings = require('../../indexes/status/mapping.json');
const elasticsearchSettings = require('../../indexes/status/settings.json');
const AliasSwapper = require("../indexer/alias_swapper");
const IndexCleaner = require("../indexer/index_cleaner");
const IndexOptimizer = require("../indexer/index_optimizer");
const DAYS_TO_KEEP = 7;
class Reporter {

  constructor(config, loggerName) {
    this.logger = new Logger(loggerName);
    this.config = config;
    this.report = {
      timestamp: (new Date()).toString(),
      statuses: {}
    };
  }

  _createReportItemIfDoesntExist(itemName) {
    // creates the report item if it doesn't already exist
    if (this.report.statuses[itemName] === undefined) {
      this.report.statuses[itemName] = {
        status: "",
        issues: [],
        version: "",
        metadata: {}
      };
    }
  }

  //deprecated
  reportStatus(itemName, status) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["status"] = status;
  }

  reportIssues(itemName, issuesObj) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["issues"].push(issuesObj);
  }

  reportVersion(itemName, version) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["version"] = version;
  }

  reportMetadata(itemName, metadata) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["metadata"] = metadata;
  }

  reportRequirements(itemName, requirements) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["requirements"] = requirements;
  }

  reportCodeJsonFetchResult(itemName, fetchResult) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["fetchResult"] = fetchResult;
  }

  reportFallbackUsed(itemName, wasFallbackUsed) {
    this._createReportItemIfDoesntExist(itemName);
    this.report.statuses[itemName]["wasFallbackUsed"] = wasFallbackUsed;
  }

  async indexReport() {
    const params = {
      "esAlias": "status",
      "esType": "status",
      "esMapping": elasticsearchMappings,
      "esSettings": elasticsearchSettings,
      "esHosts": this.config.ES_HOST
    };
    const adapter = adapters.elasticsearch.ElasticsearchAdapter;
    try {
      const indexInfo = await StatusIndexer.init(this, adapter, params);
      await IndexOptimizer.init(adapter, indexInfo, this.config);
      await AliasSwapper.init(adapter, indexInfo, this.config);
      await IndexCleaner.init(adapter, indexInfo.esAlias, DAYS_TO_KEEP, this.config);
      return indexInfo;
    } catch(error) {
      this.logger.error(error);
      throw error;
    }
  }

  writeReportToFile() {
    return new Promise((fulfill, reject) => {
      this.logger.info("Writing report to file...");
      this.report.timestamp = (new Date()).toString();

      Jsonfile.writeFile(this.config.REPORT_FILEPATH, this.report, {spaces: 2}, (err) => {
        if (err) {
          reject(err);
        }
        fulfill(err);
      });
    });
  }
}

module.exports = new Reporter(getConfig(process.env.NODE_ENV), { name: "reporter" });
