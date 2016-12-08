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
        warnings: [],
        errors: []
      };
    }
  }

  reportStatus(itemName, status) {
    this._createReportItemIfDoesntExist(itemName);
    this.report[itemName]["status"] = status;
  }

  reportWarnings(itemName, warnings) {
    this._createReportItemIfDoesntExist(itemName)
    this.report[itemName]["warnings"] = warnings;
  }

  reportErrors(itemName, errors) {
    this._createReportItemIfDoesntExist(itemName)
    this.report[itemName]["errors"] = errors;
  }

  writeReportToFile(callback) {
    this.logger.info("Writing report to file...");
    let file = `${config.REPORT_FILEPATH}/status_report.json`;
    Jsonfile.writeFile(file, this.report, (err) => {
      if (err) {
        logger.error(err);
      }
      return callback(err);
    })
  }

}

module.exports = new Reporter();
