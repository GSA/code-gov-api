/******************************************************************************

  REPORTER: a service which tracks the status of fetching/indexing and writes
  a report as a result

******************************************************************************/

const path                = require("path");
const Jsonfile            = require("jsonfile");
const Logger              = require("../../utils/logger");
const config              = require("../../config");

class Reporter {

  constructor() {
    this.logger = new Logger({ name: "reporter" });

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

  writeReportToFile(callback) {
    this.logger.info("Writing report to file...");
    this.report.timestamp = (new Date()).toString();
    const reportFilepath = path.join(
      __dirname,
      "../../",
      config.REPORT_FILEPATH
    );
    Jsonfile.writeFile(reportFilepath, this.report, (err) => {
      if (err) {
        this.logger.error(err);
      }
      return callback(err);
    });
  }

}

module.exports = new Reporter();
