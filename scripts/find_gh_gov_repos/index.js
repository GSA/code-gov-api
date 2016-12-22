/***
  Using `agencies_to_crawl.json`, finds github repositories for each org and
  produces a code.json for each agency.
***/

const fs                   = require("fs");
const _                    = require("lodash");
const async                = require("async");
const moment               = require("moment");
const Github               = require("github");
const Jsonfile             = require("jsonfile");
const githubConfig         = require("../../config/github-config.json");
const Logger               = require("../../utils/logger");
const agenciesToCrawl      = require("./agencies_to_crawl.json").agencies;

const API_CALL_PAUSE_AMOUNT = 2500;
const OUTPUT_DIR = 'data/discovered';

let logger = new Logger({ name: "find-gh-gov-repos" });

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

function fetchReposForOrg(org, callback) {
  let orgName = org["name"];
  let orgLink = org["github-link"];
  if (!orgName || !orgLink) {
    return callback(null, []);
  }
  let orgArr = orgLink.split("/");
  let ghOrgName = orgArr[orgArr.length - 2];

  logger.info(`Fetching repos for org [${ghOrgName}]...`);

  let repos = [];
  function _fetchRepos(err, res) {
    if (err) {
      logger.error(err);
      return callback(err);
    }

    // filter out the forks
    let nonForkedRepos = res.filter((repo) => {
      return !repo.fork;
    });
    repos = repos.concat(nonForkedRepos);
    if (github.hasNextPage(res)) {
      setTimeout(() => {
        logger.info(`Fetching another page of repos for org [${ghOrgName}]...`);
        github.getNextPage(res, _fetchRepos);
      }, API_CALL_PAUSE_AMOUNT);
    } else {
      let moddedRepos = repos.map((repo) => {
        repo.organization = orgName;
        return repo;
      });
      return callback(null, moddedRepos);
    }
  }

  setTimeout(() => {
    github.repos.getForOrg({
      org: ghOrgName,
      per_page: 100
    }, _fetchRepos);
  }, API_CALL_PAUSE_AMOUNT);
}

function fetchReposOwners(repos, callback) {
  let owners = {};

  repos.forEach((repo) => {
    owners[repo["id"]] = {};
  });

  function fetchOwnerData(ownerId, done) {
    logger.info(`Getting owner data for ${ownerId}.`);
    setTimeout(() => {
      github.users.getById({ id: ownerId }, (err, res) => {
        if (err) {
          logger.error(err);
          // don't cause a failure
        }
        owners[ownerId] = res;
        done();
      });
    }, API_CALL_PAUSE_AMOUNT);
  }

  let ownerIds = Object.keys(owners);
  async.eachSeries(ownerIds, fetchOwnerData, (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    callback(null, owners);
  });
}

function fetchReposLanguages(repos, callback) {
  // TODO: handle more than 100 languages per repo
  let reposLanguages = {};

  function fetchRepoLanguages(repo, done) {
    let repoId = repo.id;
    let ownerId = repo.owner.id;
    logger.info(`Getting repo languages for ${repoId}.`);
    setTimeout(() => {
      github.repos.getLanguages({
        repo: repoId,
        owner: ownerId,
        per_page: 100
      }, (err, res) => {
        if (err) {
          logger.error(err);
          // don't cause a failure
        }
        reposLanguages[repoId] = res;
        done();
      });
    }, API_CALL_PAUSE_AMOUNT);
  }

  async.eachSeries(repos, fetchRepoLanguages, (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    callback(null, reposLanguages);
  });
}

function fetchReposLicenses(repos, callback) {
  let reposLicenses = {};

  function fetchRepoLicense(repo, done) {
    let repoId = repo.id;
    let ownerId = repo.owner.id;
    logger.info(`Getting repo license for ${repoId}.`);
    setTimeout(() => {
      github.misc.getRepoLicense({
        repo: repoId,
        owner: ownerId
      }, (err, res) => {
        if (err) {
          logger.error(err);
          // don't cause a failure
        }
        reposLicenses[repoId] = res;
        done();
      });
    }, API_CALL_PAUSE_AMOUNT);
  }

  async.eachSeries(repos, fetchRepoLicense, (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    callback(null, reposLicenses);
  });
}

function crawlAgencyOrganizationRepos(agency, callback) {
  let govRepos = [];
  if (agency.organizations) {
    async.mapSeries(agency.organizations, fetchReposForOrg, (err, reposArr) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      reposArr.forEach((repos) => { govRepos = govRepos.concat(repos); });
      callback(null, govRepos);
    });
  } else {
    return callback(null, govRepos);
  }
}

function formatRepoIntoProject(repo) {
  let ownerData = {};
  if (repo.ownerData) {
    ownerData = repo.ownerData;
  }
  let languages = [];
  if (repo.languages) {
    Object.keys(repo.languages);
  }
  let downloadURL = repo["html_url"] + "/archive/master.zip";
  let licenseURL = "";
  if (repo["license"] && repo["license"].download_url) {
    licenseURL = repo["license"].download_url;
  }
  return {
    "organization": repo["organization"],
    "name": repo["name"],
    "description": repo["description"],
    "license": licenseURL,
    "openSourceProject": 1,
    "governmentWideReuseProject": 0,
    "tags": [],
    "contact": {
      "email": ownerData["email"] || null,
      "name": ownerData["name"] || null,
      "URL": ownerData["blog"] || null,
      "phone": null
    },
    "status": null,
    "vcs": "git",
    "repository": repo["html_url"],
    "homepage": repo["homepage"],
    "downloadURL": downloadURL,
    "languages": languages,
    "partners": [],
    "exemption": null,
    "updated": {
      "lastCommit": moment(repo.pushed_at).toISOString(),
      "lastModified": moment(repo.updated_at).toISOString(),
      "metadataLastUpdated": moment().toISOString()
    }
  }
}

// /archive/master.zip

function writeJsonToFile(json, callback) {
  Jsonfile.spaces = 2;
  let file = `${OUTPUT_DIR}/${json.agency}.json`;
  logger.info(`Writing output to ${file}...`);
  Jsonfile.writeFile(file, json, (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    callback();
  });
}

function crawlAgencyRepos(agency, callback) {
  logger.info(`Crawling repos for agency [${agency.name}]...`);
  let agencyRepos = [];
  let agencyOwners = {};
  let reposLanguages = {};
  let reposLicenses = {};
  async.waterfall([
    (next) => {
      fetchReposForOrg(agency, next)
    },
    (repos, next) => {
      agencyRepos = agencyRepos.concat(repos);
      crawlAgencyOrganizationRepos(agency, next);
    },
    (repos, next) => {
      agencyRepos = agencyRepos.concat(repos);
      fetchReposOwners(repos, next);
    },
    (owners, next) => {
      agencyOwners = owners;
      fetchReposLanguages(agencyRepos, next);
    },
    (languages, next) => {
      reposLanguages = languages;
      fetchReposLicenses(agencyRepos, next);
    },
    (licenses, next) => {
      reposLicenses = licenses;
      let projects = agencyRepos.map((repo) => {
        repo.ownerData = agencyOwners[repo["id"]];
        repo.languages = reposLanguages[repo["id"]];
        repo.license = reposLicenses[repo["id"]];
        return formatRepoIntoProject(repo);
      });
      let codeJson = {
        agency: agency.name,
        projects: projects
      };
      writeJsonToFile(codeJson, next);
    }
  ], callback);
}

async.eachSeries(agenciesToCrawl, crawlAgencyRepos, (err) => {
  logger.info("Done!");
});
