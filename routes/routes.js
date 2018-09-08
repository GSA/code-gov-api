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

  router.get('/repos/:id', async (request, response, next) => {
    try {
      const result = await getRepoById(request.params.id, searcher);

      if(_.isEmpty(result)) {
        const error = new Error('Not Found');
        error.status = 404;
        next(error);
      }

      response.json(result);

    } catch(error) {
      next(error);
    }
  });
  router.get('/repos', (request, response, next) => {
    queryReposAndSendResponse(searcher, request.query, logger)
      .then(result => response.json(result))
      .catch(error => next(error));
  });
  router.get('/terms', (request, response, next) => {
    getTerms(request, response, searcher)
      .then(result => response.json(result))
      .catch(error => next(error));
  });
  router.get(`/agencies`, (request, response, next) => {
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
  router.get(`/agencies/:agency_acronym`, (request, response, next) => {
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
  router.get(`/languages`, (request, response, next) => {
    let options;
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
  router.get('/repo.json', (request, response, next) => getRepoJson(response));
  router.get('/status.json', (request, response, next) => {
    getStatusData(searcher)
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
  router.get(`/status`, (request, response, next) => {
    getStatusData(searcher)
      .then(results => response.render('status', { title: "Code.gov API Status", statusData: results }))
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });

  });
  router.get(`/status/:agency/issues`, (request, response, next) => {
    let agency = request.params.agency.toUpperCase();
    getAgencyIssues(agency, searcher)
      .then(issuesData => {
        if (issuesData.statusData) {
          return response.render(`status/agency/issues`, issuesData);
        } else {
          return response.sendStatus(404);
        }
      })
      .catch(error => {
        logger.error(error);
        response.sendStatus(500);
      });
  });
  router.get(`/status/:agency/fetched`, async (request, response, next) => {
    const agency = request.params.agency.toUpperCase();

    try {
      const results = await getFetchedReposByAgency(agency, config);
      response.json(results);
    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get(`/status/:agency/discovered`, (request, response, next) => {
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
  router.get('/version', (request, response, next) => {
    getVersion(response)
      .then(versionInfo => response.json(versionInfo))
      .catch(error => {
        logger.error(error);
        response.sendStatus(404);
      });
  });

  router.get('/', (request, response, next) =>
    getRootMessage()
      .then(rootMessage => response.json(rootMessage))
  );
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
