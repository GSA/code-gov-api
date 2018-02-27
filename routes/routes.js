const _ = require('lodash');
const git = require("git-rev");
const Logger = require('../utils/logger');
const marked = require('marked');
const pkg = require("../package.json");
const Utils = require('../utils');
const repoMapping = require('../indexes/repo/mapping_200.json');
const { readStatusReportFile, getAgencyData, queryReposAndSendResponse, getFileDataByAgency } = require('./utils');

function _getRepoById (request, response, searcher, logger) {
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

function _getTerms(request, response, searcher) {
  let query = _.pick(request.query, ["term", "term_type", "size", "from"]);

  searcher.searchTerms(query, (error, terms) => {
    if (error) {
      return response.sendStatus(500);
    }
    response.json(terms);
  });
}

function _getAgencies(request, response, searcher, config, logger) {
  getAgencyData(request, searcher, config, logger)
    .then((agencies) => {
      response.json({
        total: agencies.length,
        agencies: agencies
      });
    })
    .catch(error => {
      logger.error(error);
      response.sendStatus(500);
    });
}

function _getAgency(request, response, searcher, config, logger) {
  getAgencyData(request, searcher, config)
    .then((agencies) => {
      response.json({
        total: agencies.length,
        agency: agencies[0]
      });
    })
    .catch(error => {
      logger.error(error);
      response.sendStatus(500);
    });
}

function _getLanguages(request, response, searcher, logger) {
  let query = _.pick(request.query, ["size", "from"]);
  if (request.query.language) {
    query.term = request.query.language;
  }
  query.term_type = "languages";
  query.size = query.size ? query.size : 100;

  searcher.searchTerms(query, (error, terms) => {
    if (error) {
      logger.error(error);
      return response.sendStatus(500);
    }

    let languages = [];
    terms.terms.forEach((term) => {
      languages.push({ name: term.term, numRepos: term.count });
    });

    response.json({ total: languages.length, languages });
  });
}
function _getRepoJson(response) {
  let repoJson = Utils.omitPrivateKeys(repoMapping);
  let excludeKeys = [
    "analyzer", "index",
    "format", "include_in_root",
    "include_in_all"
  ];
  repoJson = Utils.omitDeepKeys(repoJson, excludeKeys);
  response.json(repoJson["repo"]["properties"]);
}

function _getStatusJson(response, config, logger) {
  readStatusReportFile(config)
    .then(statusData => {
      statusData.statuses = _.omit( statusData.statuses, config.AGENCIES_TO_OMIT_FROM_STATUS );
      response.json(statusData);
    })
    .catch(error => {
      logger.error(error);
      response.sendStatus(500);
    });
}

function _getStatus(response, config, logger){
  readStatusReportFile(config)
    .then(statusData => response.render('status', { title: "Code.gov API Status", statusData }))
    .catch(error => {
      logger.error(error``);
      return response.sendStatus(500);
    });
}

function _getVersion(response) {
  git.long((gitHash) => {
    response.json({
      "version": pkg.version,
      "git-hash": gitHash,
      "git-repository": pkg.repository.url
    });
  });
}

function _getAgencyIssues(request, response, config, logger) {
  let agency = request.params.agency.toUpperCase();
  readStatusReportFile(config)
    .then(statusData => {
      let title = "Code.gov API Status for " + agency;
      let agencyStatusData = statusData.statuses[agency];
      if (agencyStatusData) {
        return response.render(`status/${agency}/issues`, { title, statusData: agencyStatusData });
      } else {
        return response.sendStatus(404);
      }
    })
    .catch(error => {
      logger.error(error);
      response.sendStatus(500);
    });
}

function _getDiscoveredReposByAgency(request, response, config, logger) {
  getFileDataByAgency(request, config.DISCOVERED_DIR)
    .then(discoveredData => response.json(discoveredData))
    .catch(error => {
      logger.error(error);
      return response.sendStatus(500);
    });
}

function _getFetchedReposByAgency(request, response, config, logger) {
  getFileDataByAgency(request, config.FETCHED_DIR)
    .then(fetchedData => response.json(fetchedData))
    .catch(error => {
      logger.error(error);
      return response.sendStatus(500);
    });
}

function _getRootMessage(response) {
  response.render('index', {
    filters: [marked],
    title: "Code.gov API",
    message: "Welcome to our API. Take a look at our Swagger docs https://api.code.gov/docs."
  });
}

function getApiRoutes(config, searcher, router) {

  const logger = new Logger({ name: 'routes.index', level: config.LOGGER_LEVEL });

  router.get('/repos/:id', (request, response) => _getRepoById (request, response, searcher, logger));
  router.get('/repos', (request, response) => queryReposAndSendResponse(
    searcher, request.query, response, logger));
  router.get('/terms', (request, response) => _getTerms(request, response, searcher));
  router.get(`/agencies`, (request, response) => _getAgencies(request, response, searcher, config, logger));
  router.get(`/agencies/:agency_acronym`, (request, response) => _getAgency(
    request, response, searcher, config, logger));
  router.get(`/languages`, (request, response) => _getLanguages(request, response, searcher, logger));
  router.get('/repo.json', (request, response) => _getRepoJson(response));
  router.get('/status.json', (request, response) => _getStatusJson(response, config, logger));
  router.get(`/status`, (request, response) => _getStatus(response, config, logger));
  router.get(`/status/:agency/issues`, (request, response) => _getAgencyIssues(request, response, config, logger));
  router.get(`/status/:agency/fetched`, (request, response) => _getFetchedReposByAgency(
    request, response, config, logger));
  router.get(`/status/:agency/discovered`, (request, response) => _getDiscoveredReposByAgency(
    request, response, config, logger));
  router.get('/version', (request, response) => _getVersion(response));

  router.get('/', (request, response) => _getRootMessage(response));
  return router;

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
}

module.exports = {
  getApiRoutes
};
