const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const Jsonfile            = require("jsonfile");
const diff                = require("diff");
const JSONStream          = require("JSONStream");
const Writable            = require("stream").Writable;
const getConfig           = require("../../config");
const Logger               = require("../../utils/logger");

let logger = new Logger({ name: "create-diffs" });

class CreateDiffStream extends Writable {

  constructor(config) {
    super({objectMode: true});
    this.config = config;
  }

  _readFile(folderDir, filename, next) {
    const filePath = path.join(this.config.FETCHED_DIR, filename);
    Jsonfile.readFile(filePath, next);
  }
  _performDiff(agency, callback) {
    logger.info(`Performing diff for ${agency}...`);
    async.parallel({
      "fetched": (next) => {
        this._readFile(this.config.FETCHED_DIR, `${agency}.json`, next);
      },
      "discovered": (next) => {
        this._readFile(this.config.DISCOVERED_DIR, `${agency}.json`, next);
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
        this.config.DIFFED_DIR,
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

function createDiffs(config) {
  let rs = fs.createReadStream(config.AGENCY_ENDPOINTS_FILE);
  let js = JSONStream.parse("*");
  let ds = new CreateDiffStream(config);

  rs.pipe(js).pipe(ds).on("finish", () => {
    this.logger.info(`Done.`);
  });
}

if(!module.parent) {
  createDiffs(getConfig(process.env.NODE_ENV));
}
