const _ = require('lodash');
const fs = require('fs');
const git = require("git-rev");
const pkg = require("../package.json");
const Jsonfile = require("jsonfile");
const marked = require('marked');
const Utils = require('../utils');
const repoMapping = require('../indexes/repo/mapping_200.json');

const searchPropsByType = Utils.getFlattenedMappingPropertiesByType(repoMapping["repo"]);

function readStatusReportFile (config) {
  return new Promise((resolve, reject) => {
    Jsonfile.readFile(config.REPORT_FILEPATH, (error, data) => {
      if (error) {
        reject(error);
      }
      resolve(data);
    });
  });
}

function readAgencyEndpointsFile (config) {
  return new Promise((resolve, reject) => {
    fs.readFile(config.AGENCY_ENDPOINTS_FILE, (err, data) => {
      if (err) {
        reject(err);
      }
      let agencyEndpoints = JSON.parse(data);
      resolve(agencyEndpoints);
    });
  });
}

function getAgencyTerms (searcher, options) {
  return new Promise((resolve, reject) => {
    let query = _.pick(options, ["size", "from"]);

    if (options.agency) {
      query.term = options.agency;
    }
    query.term_type = "agency.acronym";
    query.size = query.size ? query.size : 10;

    searcher.searchTerms(query, (error, terms) => {
      if (error) {
        reject(error);
      }
      resolve(terms.terms);
    });
  });
}

function getAgencyData (searcher, config, logger, options) {
  return readAgencyEndpointsFile(config).then(agenciesData => {
    let agenciesDataHash = {agencyMetaData: {}};
    agenciesData.forEach((agencyData) => {
      agenciesDataHash.agencyMetaData[agencyData.acronym] = agencyData;
    });
    return agenciesDataHash;
  })
    .then(agenciesDataHash => {
      return getAgencyTerms(searcher, options)
        .then(agencyTerms => {
          return {
            agencyTerms: {
              terms: agencyTerms
            },
            agenciesDataHash: agenciesDataHash
          };
        });
    })
    .then(agenciesData => {
      let agencies = [];
      const terms = agenciesData.agencyTerms.terms;
      const agenciesDataHash = agenciesData.agenciesDataHash;

      terms.forEach((term) => {
        let acronym = term.term.toUpperCase();
        let agencyData = agenciesDataHash.agencyMetaData[acronym];
        if(!agenciesData) {
          logger.debug(`No data agency data found for ${acronym}`);
        }

        agencies.push({
          acronym: acronym,
          name: agencyData ? agencyData.name : null,
          website: agencyData ? agencyData.website : null,
          codeUrl: agencyData ? agencyData.codeUrl : null,
          numRepos: term.count
        });
      });
      agencies.sort((a,b) => {
        if (a.name < b.name)
          return -1;
        if (a.name > b.name)
          return 1;
        return 0;
      })
      return agencies;
    });
}

function getLanguagesData (searcher, config, logger, options) {
  return new Promise((resolve, reject) => {
    let query = {};

    if (options.language) {
      query.term = options.language;
    }
    query.term_type = "languages";
    query.size = options.size || 100;
    query.from = options.from || 0;

    searcher.searchTerms(query, (error, terms) => {
      if (error) {
        reject(error);
      }

      let languages = [];
      terms.terms.forEach((term) => {
        languages.push({ name: term.term, numRepos: term.count });
      });

      resolve({ total: languages.length, languages });
    });
  });
}

function getInvalidRepoQueryParams (queryParams) {
  let without = _.without(queryParams, "from", "size", "sort", "q", "include", "exclude");

  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (_.includes(searchPropsByType["date"], paramWithoutOp)) {
        return false;
      }
    }
    return true;
  });
}

function queryReposAndSendResponse (searcher, query, response, logger) {
  let queryParams = Object.keys(query);

  if(queryParams.length) {
    // validate query params...
    let invalidParams = getInvalidRepoQueryParams(queryParams);
    if (invalidParams.length > 0) {
      let error = {
        "Error": "Invalid query params.",
        "Invalid Params": invalidParams
      };
      logger.error(error);
      return response.status(400).json(error);
    }
  }

  searcher.searchRepos(query, (error, repos) => {
    if(error) {
      logger.error(error);
      return response.sendStatus(500);
    }
    response.json(repos);
  });
}

function getFileDataByAgency(agency, directoryPath) {
  return new Promise((resolve, reject) => {
    const filePath = `${directoryPath}/${agency}.json`;
    Jsonfile.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      }
      if (!data.title) {
        data.title = "Code.gov API Status for " + agency;
      }
      resolve(data);
    });
  });
}

function getRepoById (request, response, searcher, logger) {
  let id = request.params.id;
  searcher.getRepoById(id, (error, repo) => {
    if (error) {
      logger.error(error);
      return response.sendStatus(500);
    }
    if (!_.isEmpty(repo)) {
      response.json(repo);
    } else {
      response.sendStatus(404);
    }
  });
}

function getTerms(request, response, searcher) {
  let query = _.pick(request.query, ["term", "term_type", "size", "from"]);

  searcher.searchTerms(query, (error, terms) => {
    if (error) {
      return response.sendStatus(500);
    }
    response.json(terms);
  });
}

function getAgencies(request, searcher, config, logger) {
  let options = _.pick(request.query, ["size", "from"]);
  options.agency = request.query.agency;
  return getAgencyData(searcher, config, logger, options)
    .then((agencies) => {
      return {
        total: agencies.length,
        agencies: agencies
      };
    });
}

function getAgency(request, searcher, config, logger) {
  let options = _.pick(request.query, ["size", "from"]);
  options.agency = request.params.agency_acronym;

  return getAgencyData(searcher, config, logger, options)
    .then((agencies) => {
      return {
        total: agencies.length,
        agency: agencies[0]
      };
    });
}

function getLanguages(request, searcher, config, logger) {
  let options = _.pick(request.query, ["size", "from"]);
  return getLanguagesData(searcher, config, logger, options)
    .then(results => results);
}

function getRepoJson(response) {
  let repoJson = Utils.omitPrivateKeys(repoMapping);
  let excludeKeys = [
    "analyzer", "index",
    "format", "include_in_root",
    "include_in_all"
  ];
  repoJson = Utils.omitDeepKeys(repoJson, excludeKeys);
  response.json(repoJson["repo"]["properties"]);
}

function getStatusData(config){
  return readStatusReportFile(config)
    .then(statusData => statusData);
}

function getVersion() {
  return new Promise((resolve, reject) => {
    try {
      git.long((gitHash) => {
        resolve({
          "version": pkg.version,
          "git-hash": gitHash,
          "git-repository": pkg.repository.url
        });
      });
    } catch(error) {
      reject(error);
    }
  });
}

function getAgencyIssues(agency, config) {
  return readStatusReportFile(config)
    .then(statusData => {
      let title = "Code.gov API Status for " + agency;
      return { title, statusData: statusData.statuses[agency] };
    });
}

function getDiscoveredReposByAgency(agency, config) {
  return getFileDataByAgency(agency, config.DISCOVERED_DIR)
    .then(fetchedData => fetchedData);
}

function getFetchedReposByAgency(agency, config) {
  return getFileDataByAgency(agency, config.FETCHED_DIR)
    .then(fetchedData => fetchedData);
}

function getRootMessage(response) {
  response.render('index', {
    filters: [marked],
    title: "Code.gov API",
    message: "Welcome to our API. Take a look at our Swagger docs https://api.code.gov/docs."
  });
}

module.exports = {
  readStatusReportFile,
  getAgencyData,
  queryReposAndSendResponse,
  getFileDataByAgency,
  getRepoById,
  getTerms,
  getAgencies,
  getAgency,
  getLanguages,
  getRepoJson,
  getStatusData,
  getVersion,
  getAgencyIssues,
  getDiscoveredReposByAgency,
  getFetchedReposByAgency,
  getRootMessage
};
