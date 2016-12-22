const fs                  = require("fs");
const _                   = require("lodash");
const path                = require("path");
const async               = require("async");
const Jsonfile            = require("jsonfile");
const diff                = require("diff");
const JSONStream          = require("JSONStream");
const Writable            = require("stream").Writable;

const config              = require("../../config");
const Logger               = require("../../utils/logger");

const AGENCY_ENDPOINTS_FILE = path.join(
  __dirname, "../../", config.AGENCY_ENDPOINTS_FILE
);

let logger = new Logger({ name: "create-diffs" });

class CreateDiffStream extends Writable {

  constructor() {
    super({objectMode: true});
  }

  _performDiff(agency, callback) {
    logger.info(`Performing diff for ${agency}...`);
    async.parallel({
      "fetched": (next) => {
        let fetchedFilepath = path.join(
          __dirname,
          "../../",
          config.FETCHED_DIR,
          `${agency}.json`
        );
        Jsonfile.readFile(fetchedFilepath, next);
      },
      "discovered": (next) => {
        let discoveredFilepath = path.join(
          __dirname,
          "../../",
          config.DISCOVERED_DIR,
          `${agency}.json`
        );
        Jsonfile.readFile(discoveredFilepath, next);
      }
    }, (err, {fetched, discovered}) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      let diffChunks = diff.diffJson(fetched, discovered);
      callback(null, diffChunks);
    });
  }

  _write(agency, enc, next) {
    let agencyName = agency.acronym.toUpperCase();
    this._performDiff(agencyName, (err, diffChunks) => {
      let diffedFilepath = path.join(
        __dirname,
        "../../",
        config.DIFFED_DIR,
        `${agencyName}.json`
      );
      logger.info(`Writing output to ${diffedFilepath}...`);
      Jsonfile.writeFile(diffedFilepath, diffChunks, (err) => {
        if (err) {
          logger.error(err);
          return next(err);
        }
        return next();
      });
    });
  }

}

let rs = fs.createReadStream(AGENCY_ENDPOINTS_FILE);
let js = JSONStream.parse("*");
let ds = new CreateDiffStream();

rs.pipe(js).pipe(ds).on("finish", () => {
  this.logger.info(`Done.`);
});
