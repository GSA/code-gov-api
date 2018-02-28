const _ = require('lodash');
const Logger = require('../utils/logger');
const {
  queryReposAndSendResponse,
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
  getRootMessage } = require('./utils');

function getApiRoutes(config, searcher, router) {

  const logger = new Logger({ name: 'routes.index', level: config.LOGGER_LEVEL });

  router.get('/repos/:id', (request, response) => getRepoById (request, response, searcher, logger));
  router.get('/repos', (request, response) => queryReposAndSendResponse(
    searcher, request.query, response, logger));
  router.get('/terms', (request, response) => getTerms(request, response, searcher));
  router.get(`/agencies`, (request, response) => {
    getAgencies(request, searcher, config, logger)
      .then(result => {
        if(result) {
          response.json(result);
        } else {
          response.sendStatus(404);
        }
      })
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });
  });
  router.get(`/agencies/:agency_acronym`, (request, response) => {
    getAgency(request, searcher, config, logger)
      .then(results => {
        if(results) {
          response.json(results);
        } else {
          response.sendStatus(404);
        }
      })
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });
  });
  router.get(`/languages`, (request, response) => {
    let options
    getLanguages(request, searcher, logger, options)
      .then(results => {
        if (results) {
          response.json(results);
        } else {
          response.sendStatus(404);
        }
      })
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });
  });
  router.get('/repo.json', (request, response) => getRepoJson(response));
  router.get('/status.json', (request, response) => {
    getStatusData(config)
      .then(results => {
        if(results){
          results.statuses = _.omit( results.statuses, config.AGENCIES_TO_OMIT_FROM_STATUS );
          response.json(results);
        } else {
          response.sendStatus(404);
        }
      })
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });
  });
  router.get(`/status`, (request, response) => {
    getStatusData(response, config, logger)
      .then(results => response.render('status', { title: "Code.gov API Status", results }))
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });

  });
  router.get(`/status/:agency/issues`, (request, response) => {
    let agency = request.params.agency.toUpperCase();
    getAgencyIssues(agency, config)
      .then(issuesData => {
        if (issuesData.statusData) {
          return response.render(`status/${agency}/issues`, issuesData);
        } else {
          return response.sendStatus(404);
        }
      })
      .catch(error => {
        logger.error(error);
        response.sendStatus(500);
      });
  });
  router.get(`/status/:agency/fetched`, (request, response) => {
    const agency = request.params.agency.toUpperCase();

    if(agency) {
      getFetchedReposByAgency(agency, config)
        .then(results => {
          if(results) {
            response.json(results);
          } else {
            response.sendStatus(404);
          }
        })
        .catch(error => {
          logger.error(error);
          response.sendStatus(404);
        });
    } else {
      response.sendStatus(400);
    }
  });
  router.get(`/status/:agency/discovered`, (request, response) => {
    const agency = request.params.agency.toUpperCase();

    if(agency) {
      getDiscoveredReposByAgency(agency, config)
        .then(results => {
          if(results) {
            response.json(results);
          } else {
            response.sendStatus(404);
          }
        })
        .catch(error => {
          logger.error(error);
          response.sendStatus(404);
        });
    } else {
      response.sendStatus(400);
    }
  });
  router.get('/version', (request, response) => {
    getVersion(response)
      .then(versionInfo => response.json(versionInfo))
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });
  });

  router.get('/', (request, response) => getRootMessage(response));
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
