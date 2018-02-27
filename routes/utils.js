const _ = require('lodash');
const fs = require('fs');
const Jsonfile = require("jsonfile");
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

function getAgencyTerms (request, searcher) {
  return new Promise((resolve, reject) => {
    let query = _.pick(request.query, ["size", "from"]);
    if (request.query.acronym) {
      query.term = request.query.acronym;
    }
    if (request.params.agency_acronym) {
      query.term = request.params.agency_acronym;
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

function getAgencyData (request, searcher, config, logger) {
  return readAgencyEndpointsFile(config).then(agenciesData => {
    let agenciesDataHash = {agencyMetaData: {}};
    agenciesData.forEach((agencyData) => {
      agenciesDataHash.agencyMetaData[agencyData.acronym] = agencyData;
    });
    return agenciesDataHash;
  })
    .then(agenciesDataHash => {
      return getAgencyTerms(request, searcher)
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
      return agencies;
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

function getFileDataByAgency(request, directoryPath) {
  return new Promise((resolve, reject) => {
    let agency = request.params.agency.toUpperCase();
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

module.exports = {
  readStatusReportFile,
  getAgencyData,
  queryReposAndSendResponse,
  getFileDataByAgency
};
