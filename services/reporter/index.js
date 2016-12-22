/******************************************************************************

  REPORTER: a service which tracks the status of fetching/indexing and writes
  a report as a result

******************************************************************************/

const _                   = require("lodash");
const fs                  = require("fs");
const path                = require("path");
const Jsonfile            = require("jsonfile");
const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");
const config              = require("../../config");

class Reporter {

  constructor() {
    this.logger = new Logger({ name: "reporter" });

    this.report = {};
  }

  _createReportItemIfDoesntExist(itemName) {
    // creates the report item if it doesn't already exist
    if (this.report[itemName] === undefined) {
      this.report[itemName] = {
        status: "",
        issues: [],
        metadata: {}
      };
    }
  }

  reportStatus(itemName, status) {
    this._createReportItemIfDoesntExist(itemName);
    this.report[itemName]["status"] = status;
  }

  reportIssues(itemName, issuesObj) {
    this._createReportItemIfDoesntExist(itemName);
    this.report[itemName]["issues"].push(issuesObj);
  }

  reportMetadata(itemName, metadata) {
    this._createReportItemIfDoesntExist(itemName);
    this.report[itemName]["metadata"] = metadata;
  }

  writeReportToFile(callback) {
    this.logger.info("Writing report to file...");
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
    })
  }

}

module.exports = new Reporter();
