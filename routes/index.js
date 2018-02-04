const _ = require('lodash');
const async = require("async");
const fs = require('fs');
const git = require("git-rev");
const Jsonfile = require("jsonfile");
const Logger = require('../utils/logger');
const marked = require('marked');
const pkg = require("../package.json");
const Utils = require('../utils');
const repoMapping = require('../indexes/repo/mapping_200.json');

const logger = new Logger({ name: 'routes.index' });

const searchPropsByType = Utils.getFlattenedMappingPropertiesByType(repoMapping["repo"]);

const _readStatusReportFile = (config, next) => {
  fs.readFile(config.REPORT_FILEPATH, (err, data) => {
    if (err) {
      return next(err);
    }
    let statusData = JSON.parse(data);
    statusData.statuses = _.omit(
      statusData.statuses,
      config.AGENCIES_TO_OMIT_FROM_STATUS
    );
    return next(null, statusData);
  });
};

const _readAgencyEndpointsFile = (config, next) => {
  fs.readFile(config.AGENCY_ENDPOINTS_FILE, (err, data) => {
    if (err) {
      return next(err);
    }
    let agencyEndpoints = JSON.parse(data);
    return next(null, agencyEndpoints);
  });
};

const _getInvalidRepoQueryParams = (queryParams) => {
  let without = _.without(queryParams,
    "from", "size", "sort", "_fulltext", "include", "exclude");
  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (
        _.includes(searchPropsByType["date"], paramWithoutOp) ||
        _.includes(searchPropsByType["byte"], paramWithoutOp)
      ) {
        return false;
      }
    } else if (
      queryParam.endsWith("_lon") ||
      queryParam.endsWith("_lat") ||
      queryParam.endsWith("_dist")
    ) {
      // special endings for geo distance filtering.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["geo_point"], paramWithoutOp) ) {
        return false;
      }
    }
    return true;
  });
};

const queryReposAndSendResponse = (searcher, query, response, next) => {
  let queryParams = Object.keys(query);
  // validate query params...
  let invalidParams = _getInvalidRepoQueryParams(queryParams);
  if (invalidParams.length > 0) {
    let error = {
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    };
    logger.error(error);
    return response.status(400).json(error);
  }

  searcher.searchRepos(query, (error, repos) => {
    if(error) {
      logger.error(error);
      return response.sendStatus(500);
    }
    response.json(repos);
  });
};

function _getFileDataByAgency(request, directoryPath) {
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

function getApiRoutes(config, searcher, router) {
  /* get a repo by nci or nct id */
  router.get('/repos/:id', (request, response) => {
    let id = request.params.id;
    searcher.getRepoById(id, (error, repo) => {
      // TODO: add better error handling
      if (error) {
        return response.sendStatus(500);
      }
      if (!_.isEmpty(repo)) {
        response.json(repo);
      } else {
        response.sendStatus(404);
      }
    });
  });
  /* get repos that match supplied search criteria */
  router.get('/repos', (request, response, next) => {
    let query = request.query;
    queryReposAndSendResponse(searcher, query, response, next);
  });

  /* get key terms that can be used to search through repos */
  router.get('/terms', (request, response) => {
    let query = _.pick(request.query, ["term", "term_type", "size", "from"]);

    searcher.searchTerms(query, (error, terms) => {
      // TODO: add better error handling
      if (error) {
        return response.sendStatus(500);
      }
      response.json(terms);
    });
  });

  router.get(`/agencies`, (request, response) => {
    // NOTE: this relies on the terms endpoint and the `agency.acronym` term type

    async.parallel({
      agencyDataHash: (next) => {
        _readAgencyEndpointsFile(config, (error, agencyEndpoints) => {
          if (error) {
            return next(error);
          }
          let agencyDataHash = {};
          agencyEndpoints.forEach((agencyEndpoint) => {
            agencyDataHash[agencyEndpoint.acronym] = agencyEndpoint;
          });
          return next(null, agencyDataHash);
        });
      },
      terms: (next) => {
        let query = _.pick(request.query, ["size", "from"]);
        if (request.query.acronym) {
          query.term = request.query.acronym;
        }
        query.term_type = "agency.acronym";
        query.size = query.size ? query.size : 100;

        searcher.searchTerms(query, (error, terms) => {
          if (error) {
            return next(error);
          }
          return next(null, terms.terms);
        });
      }
    }, (error, {
      agencyDataHash,
      terms
    }) => {
      if (error) {
        logger.error(error);
        return response.sendStatus(500);
      }

      let agencies = [];
      terms.forEach((term) => {
        let acronym = term.term.toUpperCase();
        let agencyData = agencyDataHash[acronym];
        agencies.push({
          acronym: acronym,
          name: agencyData.name,
          website: agencyData.website,
          codeUrl: agencyData.codeUrl,
          numRepos: term.count
        });
      });

      response.json({
        total: agencies.length,
        agencies: agencies
      });
    });
  });

  router.get(`/languages`, (request, response, next) => {
    // NOTE: this relies on the terms endpoint and the `languages` term type

    let q = _.pick(request.query, ["size", "from"]);
    if (request.query.language) {
      q.term = request.query.language;
    }
    q.term_type = "languages";
    q.size = q.size ? q.size : 100;

    searcher.searchTerms(q, (err, terms) => {
      if (err) {
        return next(err);
      }

      let languages = [];
      terms.terms.forEach((term) => {
        languages.push({
          name: term.term,
          numRepos: term.count
        });
      });

      response.json({
        total: languages.length,
        languages: languages
      });
    });
  });

  router.get('/repo.json', (request, response) => {
    let repoJson = Utils.omitPrivateKeys(repoMapping);
    let excludeKeys = [
      "analyzer", "index",
      "format", "include_in_root",
      "include_in_all"
    ];
    repoJson = Utils.omitDeepKeys(repoJson, excludeKeys);
    response.json(repoJson["repo"]["properties"]);
  });

  router.get('/status.json', (request, response) => {
    _readStatusReportFile(config, (err, statusData) => {
      if (err) {
        logger.error(err);
        return response.sendStatus(500);
      }
      response.json(statusData);
    });
  });

  router.get(`/status`, (request, response) => {
    _readStatusReportFile(config, (err, statusData) => {
      if (err) {
        logger.error(err);
        return response.sendStatus(500);
      }
      let title = "Code.gov API Status";
      response.render('status', {
        title,
        statusData
      });
    });
  });

  router.get(`/status/:agency/issues`, (request, response) => {
    let agency = request.params.agency.toUpperCase();
    fs.readFile(config.REPORT_FILEPATH, (err, data) => {
      if (err) {
        logger.error(err);
        return response.sendStatus(500);
      }
      let title = "Code.gov API Status for " + agency;
      let statusData = JSON.parse(data).statuses[agency];
      if (statusData) {
        return response.render('status/agency/issues', {
          title,
          statusData
        });
      } else {
        return response.sendStatus(404);
      }

    });

  });

  router.get(`/status/:agency/fetched`, (request, response) => {
    _getFileDataByAgency(request, config.FETCHED_DIR)
    .then(fetchedData => response.json(fetchedData))
    .catch(error => {
      logger.error(error);
      return response.sendStatus(500);
    });
  });

  router.get(`/status/:agency/discovered`, (request, response) => {
    _getFileDataByAgency(request, config.DISCOVERED_DIR)
      .then(discoveredData => response.json(discoveredData))
      .catch(error => {
        logger.error(error);
        return response.sendStatus(500);
      });
  });

  // router.get(`/status/:agency/diff`, (req, res, next) => {
  //   let agency = req.params.agency.toUpperCase();
  //   Jsonfile.readFile(path.join(
  //     __dirname,
  //     config.DIFFED_DIR,
  //     `${agency}.json`
  //   ), (err, diffChunks) => {
  //     if (err) {
  //       logger.error(err);
  //       return res.sendStatus(500);
  //     }
  //     let title = "Code.gov API Diff for " + agency;
  //     return res.render('status/agency/diff', { title, diffChunks });
  //   });
  // });

  router.get('/version', (request, response) => {
    const _sendVersionResponse = (gitHash) => {
      response.json({
        "version": pkg.version,
        "git-hash": gitHash,
        "git-repository": pkg.repository.url
      });
    };

    git.long((gitHash) => {
      _sendVersionResponse(gitHash);
    });
  });

  router.get('/', (request, response) => {
    let title = "Code.gov API";
    response.render('index', {
      filters: [marked],
      title: title
    });
  });

  return router;
}

module.exports = getApiRoutes;
