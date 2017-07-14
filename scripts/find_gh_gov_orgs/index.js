/***
  Searches for github organizations that *might* be maintained by the US
  government.
***/

const fs                   = require("fs");
const _                    = require("lodash");
const async                = require("async");
const moment               = require("moment");
const Github               = require("github");
const Jsonfile             = require("jsonfile");
const githubConfig         = require("../../config/github-config.json");
const Logger               = require("../../utils/logger");

const API_CALL_PAUSE_AMOUNT = 2500;
const OUTPUT_FILE = 'tmp/data.json';

let logger = new Logger({ name: "find-gh-gov-orgs" });

let github = new Github({
  protocol: "https",
  followRedirects: false,
  timeout: 5000
});

github.authenticate({
  type: "basic",
  username: githubConfig.username,
  password: githubConfig.password
});

/**
 * Searches for gov repos (only mention of gov in the repo title, desc, or readme)
 * @param callback
 */
function searchForGovRepos(callback) {
  // NOTE: must split up into time ranges because github has a 1000 result limit
  // when executing a repository search
  const dateFormat = "YYYY-MM-DD";
  let timeRanges = [];
  // create catch all bin for < 1 month
  timeRanges.push(moment().subtract(1, "months").format(dateFormat) + " .. *");
  // create month-long time range bins for the last 5 years
  for (let i = 1; i <= 5 * 12; i++) {
    timeRanges.push(
      moment().subtract(i + 1, "months").format(dateFormat) +
      " .. " +
      moment().subtract(i, "months").format(dateFormat)
    );
  }
  // create year-long time range bins for years 5-10
  for (let i = 5; i <= 10; i++) {
    timeRanges.push(
      moment().subtract(i + 1, "years").format(dateFormat) +
      " .. " +
      moment().subtract(i, "years").format(dateFormat)
    );
  }
  // create catch all bin for > 10 years
  timeRanges.push("* .. " + moment().subtract(10, "years").format(dateFormat));

  async.mapSeries(timeRanges, searchForGovReposInTimeRange, (err, govReposArr) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    let govRepos = [];
    govReposArr.forEach((arr) => {
      govRepos = govRepos.concat(arr); 
    });
    logger.info(`Found ${govRepos.length} repos in total.`);
    callback(null, govRepos);
  });
}

function searchForGovReposInTimeRange(timeRange, callback) {
  let govRepos = [];
  function getRepos(err, res) {
    if (err) {
      logger.error(err);
      return callback(err);
    }

    govRepos = govRepos.concat(res.items);
    logger.info(
      `Searching for gov repos in time range ${timeRange}. ` +
      `Found ${govRepos.length}/${res.total_count}.`
    );
    if (github.hasNextPage(res)) {
      setTimeout(() => {
        github.getNextPage(res, getRepos);
      }, API_CALL_PAUSE_AMOUNT);
    } else {
      return callback(null, govRepos);
    }
  }

  setTimeout(() => {
    github.search.repos({
      q: `gov created:"${timeRange}"`,
      per_page: 100
    }, getRepos);
  }, API_CALL_PAUSE_AMOUNT);
}

function getOwnersFromRepos(repos, callback) {
  let owners = _.uniq(repos.map((repo) => {
    return repo.owner.id;
  }));
  return callback(null, owners);
}

function filterForGovOrgs(owners, callback) {
  function writeIfGovOrg(user, done) {
    if (user && user.email) {
      if (
        user.type === "Organization" &&
        user.email.substr(user.email.length - 4) === ".gov"
      ) {
        logger.info(`Writing ${user.name} to file.`);
        return writeJsonToFile(user, done);
      }
    }
    return done();
  }

  function getOwnerData(ownerId, done) {
    logger.info(`Getting owner data for ${ownerId}.`);
    setTimeout(() => {
      github.users.getById({ id: ownerId }, (err, res) => {
        writeIfGovOrg(res, done);
      });
    }, API_CALL_PAUSE_AMOUNT);
  }

  logger.info(
    `Iterating through ${owners.length} deduped owners to find gov orgs.`
  );
  async.eachSeries(owners, getOwnerData, (err, done) => {
    callback(err);
    Logger.info('done', done);
  });
}

function startWriteToFile(callback) {
  fs.writeFile(OUTPUT_FILE, "[", (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    return callback();
  });
}

function endWriteToFile(callback) {
  fs.appendFile(OUTPUT_FILE, "]", (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    return callback();
  });
}

function writeJsonToFile(json, callback) {
  Jsonfile.spaces = 2;
  Jsonfile.writeFile(OUTPUT_FILE, json, {flag: 'a'}, (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    fs.appendFile(OUTPUT_FILE, ",", (err) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      return callback();
    });
  });
}

async.waterfall([
  (next) => {
    startWriteToFile(next); 
  },
  (next) => {
    searchForGovRepos(next); 
  },
  (repos, next) => {
    getOwnersFromRepos(repos, next); 
  },
  (owners, next) => {
    filterForGovOrgs(owners, next); 
  },
  (next) => {
    endWriteToFile(next); 
  }
], (err) => {
  logger.error("Err", err);
});
