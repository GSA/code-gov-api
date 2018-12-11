const _ = require('lodash');
const fs = require('fs');
const git = require("git-rev");
const pkg = require("../package.json");
const Jsonfile = require("jsonfile");
const Utils = require('../utils');
const repoMapping = require('../indexes/repo/mapping.json');
const { getQueryByTerm } = require('@code.gov/code-gov-adapter').elasticsearch;
const fetch = require('node-fetch');

async function readAgencyMetadataFile (config, logger) {
  let response;

  if(config.GET_REMOTE_METADATA) {
    try {
      response = await fetch(config.AGENCY_ENDPOINTS_FILE);
      return response.json();
    } catch(error) {
      logger.error(`[ERROR] Reading remote metadata file at ${config.AGENCY_ENDPOINTS_FILE}`, error);
      throw error;
    }
  }

  try {
    const data = fs.readFileSync(config.AGENCY_ENDPOINTS_FILE);
    return JSON.parse(data);
  } catch(error) {
    logger.error(`[ERROR] Reading local metadata file at ${config.AGENCY_ENDPOINTS_FILE}`, error);
    throw error;
  }
}

function getAgencyTerms (request) {
  let query = _.pick(request.query, ["size", "from"]);

  if (request.params.agency) {
    query.term = request.params.agency;
  }
  if (request.params.agency_acronym) {
    query.term = request.params.agency_acronym;
  }
  query.term_type = "agency.acronym";
  query.size = query.size ? query.size : 10;

  return query;
}

async function getAgencyMetaData(config, logger) {
  try{
    const data = await readAgencyMetadataFile(config, logger);
    let agenciesDataHash = {agencyMetaData: {}};

    data.forEach((agencyData) => {
      agenciesDataHash.agencyMetaData[agencyData.acronym] = agencyData;
    });

    return agenciesDataHash;
  } catch(error) {
    logger.error(error);
    throw error;
  }

}

function getAgencyData (agenciesData, logger, options) {
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
      return options.sort === 'asc' ? -1 : 1;
    if (a.name > b.name)
      return options.sort === 'asc' ? 1 : -1;
    return 0;
  });
  return agencies;
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
  const searchPropsByType = Utils.getFlattenedMappingPropertiesByType(repoMapping["repo"]);

  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["text"], queryParam)) {
      return false;
    }

    if (_.includes(searchPropsByType["keyword"], queryParam)) {
      return false;
    }

    if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (_.includes(searchPropsByType["date"], paramWithoutOp)) {
        return false;
      }
    }

    return true;
  });
}

function queryReposAndSendResponse (searcher, query, logger) {
  let queryParams = Object.keys(query);

  return new Promise((resolve, reject) => {
    if(queryParams.length) {
      let invalidParams = getInvalidRepoQueryParams(queryParams);
      if (invalidParams.length > 0) {
        let error = {
          "Error": "Invalid query params.",
          "Invalid Params": invalidParams
        };
        logger.trace(error);
        reject(error);
      }
    }

    searcher.searchRepos(query, (error, repos) => {
      if(error) {
        logger.error(error);
        reject(error);
      }
      resolve(repos);
    });
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

function getRepoById (id, searcher) {
  return new Promise((resolve, reject) => {
    searcher.getRepoById(id, (error, repo) => {
      if (error) {
        reject(error);
      }
      resolve(repo);
    });
  });
}

function getTerms(request, response, searcher) {
  return new Promise((resolve, reject) => {
    let query = _.pick(request.query, ["term", "term_type", "size", "from"]);

    searcher.searchTerms(query, (error, terms) => {
      if (error) {
        reject(error);
      }
      resolve(terms);
    });
  });
}

function getAgencies(agenciesData, requestOptions, logger) {
  let options = _.pick(requestOptions, ["size", "from", "sort"]);
  const agencies = getAgencyData(agenciesData, logger, options);

  return {
    total: agencies.length,
    agencies
  };
}

async function getAgency(request, adapter, config, logger) {
  const agenciesMetaData = await getAgencyMetaData(config, logger);

  const queryParams = getAgencyTerms(request);
  const searchQuery = getQueryByTerm({ term: queryParams.term, termType: queryParams.term_type });
  const results = await adapter.search({ index: 'terms', type: 'term', body: searchQuery });

  const agenciesData = {
    agencyTerms: {
      terms: results.data
    },
    agenciesDataHash: agenciesMetaData
  };

  const {agencies, total} = getAgencies(agenciesData, request.query, logger);

  if(total === 0) {
    logger.warning(`No data for agency: ${request.params.agency_acronym} was found`);
  }

  return agencies[0];
}

function getLanguages(request, searcher, config, logger) {
  let options = _.pick(request.query, ["size", "from"]);
  return getLanguagesData(searcher, config, logger, options)
    .then(results => results);
}

function getRepoJson() {
  let repoJson = Utils.omitPrivateKeys(repoMapping);
  let excludeKeys = [
    "analyzer", "index", "format", "include_in_root", "include_in_all"
  ];
  repoJson = Utils.omitDeepKeys(repoJson, excludeKeys);
  return repoJson["repo"]["properties"];
}

function getStatusData (searcher){
  return new Promise((resolve, reject) => {
    searcher.searchStatus((error, data) => {
      if(error) {
        return reject(error);
      }
      return resolve({ timestamp: data[0].timestamp, statuses: data[0].statuses });
    });
  });
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

function getAgencyIssues(agency, searcher) {
  return getStatusData(searcher)
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

function getRootMessage() {
  return getVersion().then(version => {
    return {
      title: 'Code.gov API',
      api_version: version,
      swagger_docs_url: 'https://api.code.gov/docs',
      end_points: [
        '/repos',
        '/repos.json',
        '/status.json',
        '/terms',
        '/agencies',
        '/languages',
        '/version'
      ]
    };
  });
}

function formatIssues(issues) {
  return issues.map(issue => {
    const labels = parseLabels(issue.labels);
    const formattedIssue = {
      id: issue.issueId,
      title: issue.title,
      description: issue.description,
      languages: issues.languages || [],
      projectURL: `https://code.gov/projects/${issue.repoId}`,
      issueURL: issue.url,
      featured: true,
      active: true,
      popular: true,
      license: issue.license || null,
      agency: {
        name: issue.agencyName,
        acronym: issue.agencyAcronym
      },
      date: {
        lastModified: issue.updated_at
      }
    };
    return Object.assign(formattedIssue, labels);
  });
}

function parseLabels(labels) {
  let processedLabels = {};

  labels.forEach(label => {
    if(label.match(/\[issue-type\]/)){
      processedLabels.type = label.split(" ")[1];
    }
    if(label.match(/\[skill-level\]/)){
      processedLabels.skill = label.split(" ")[1];
    }
    if(label.match(/\[effort\]/)){
      processedLabels.effort = label.split(" ")[1];
    }
    if(label.match(/\[impact\]/)){
      processedLabels.impact = label.split(" ")[1];
    }
  });

  return processedLabels;
}

module.exports = {
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
  getRootMessage,
  getInvalidRepoQueryParams,
  readAgencyMetadataFile,
  getAgencyMetaData,
  getAgencyTerms,
  parseLabels,
  formatIssues
};
