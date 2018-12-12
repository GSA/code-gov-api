const _ = require('lodash');
const Logger = require('../utils/logger');
const {
  ElasticsearchAdapter,
  createFieldSearchQuery,
  createReposSearchQuery,
  searchTermsQuery,
  getLanguagesSearchQuery
} = require('@code.gov/code-gov-adapter').elasticsearch;
const {
  getInvalidRepoQueryParams,
  getAgencies,
  getAgencyTerms,
  getRepoJson,
  getVersion,
  getRootMessage,
  getAgencyMetaData,
  formatIssues,
  getAgency
} = require('./utils');

const mappings = require('../indexes/repo/mapping.json');
const settings = require('../indexes/repo/settings.json');

function getApiRoutes(config, router) {

  const logger = new Logger({ name: 'routes.index', level: config.LOGGER_LEVEL });
  const adapter = new ElasticsearchAdapter({ hosts: config.ES_HOST, logger: Logger, mappings, settings });

  router.get('/repos/:id', async (request, response, next) => {
    try {
      const searchQuery = createFieldSearchQuery({
        queryType: 'match',
        field: 'repoID',
        value: request.params.id
      });
      const results = await adapter.search({ index: 'repos', type: 'repo', body: searchQuery });

      if(results.hasOwnProperty('data') === false || results.data.length === 0) {
        const error = new Error('Not Found');
        error.status = 404;
        throw error;
      }

      response.json(results.data);

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get('/repos', async (request, response, next) => {
    const queryParamKeys = request.query;

    try {
      if(Object.keys(queryParamKeys).length) {
        let invalidParams = getInvalidRepoQueryParams(queryParamKeys);

        if (invalidParams.length > 0) {
          const error = new Error(`Invalid query parameters: ${invalidParams}`);
          error.status = 400;
          throw error;
        }
      }

      const searchQuery = createReposSearchQuery({ queryParams: request.query });
      const results = await adapter.search({ index: 'repos', type: 'repo', body: searchQuery });

      if(results.hasOwnProperty('data') === false || results.data.length === 0) {
        logger.warning(`No repos data was found for the query params: ${JSON.stringify(request.query)}`);
      }

      response.json({
        total: results.total,
        repos: results.data
      });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get('/terms', async (request, response, next) => {
    try {
      const searchQuery = searchTermsQuery({
        queryParams: request.query,
        termTypesToSearch: config.TERM_TYPES_TO_SEARCH
      });

      const results = await adapter.search({
        index: 'terms',
        type: 'term',
        body: searchQuery
      });

      if(results.hasOwnProperty('data') === false || results.data.length === 0) {
        logger.warning(`No terms data was found for the query params: ${JSON.stringify(request.query)}`);
      }

      response.json({
        total: results.total,
        terms: results.data
      });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get('/open-tasks', async (request, response, next) => {
    let formattedResults = [];
    try {
      const size = request.query.size || 10;
      const from = request.query.from || 0;

      const results = await adapter.search({ index: 'issues', type: 'issue', body: { size, from } });

      if(results.hasOwnProperty('data') === false || results.data.length === 0) {
        logger.warning(`No issues data was found for the query params: ${JSON.stringify(request.query)}`);
      } else {
        formattedResults = formatIssues(results.data);
      }

      response.json({ total: results.total, items: formattedResults });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get(`/agencies`, async (request, response, next) => {
    try {
      const agenciesMetaData = await getAgencyMetaData(config, logger);

      const queryParams = getAgencyTerms(request);
      const searchQuery = searchTermsQuery({ queryParams, termTypesToSearch: config.TERM_TYPES_TO_SEARCH });
      const results = await adapter.search({ index: 'terms', type: 'term', body: searchQuery });

      const agenciesData = {
        agencyTerms: {
          terms: results.data
        },
        agenciesDataHash: agenciesMetaData
      };

      const {total, agencies} = getAgencies(agenciesData, request.query, logger);

      if(total === 0) {
        logger.warning(`No agencies data was found for the query params: ${JSON.stringify(request.query)}`);
      }
      response.json({ total, agencies });
    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get(`/agencies/:agency_acronym`, async (request, response, next) => {

    try {
      const agency = await getAgency(request, adapter, config, logger);

      response.json(agency || {} );
    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get(`/languages`, async (request, response, next) => {
    try {
      const searchQeury = getLanguagesSearchQuery(request.query);
      const { total, data } = await adapter.search({ index: 'terms', type: 'term', body: searchQeury });

      if(data || data.length === 0) {
        logger.warning(`No data for languages was found`);
      }

      const languages = data.map(language => {
        return {
          name: language.term,
          numRepos: language.count
        };
      });

      response.json({ total, languages });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get('/repo.json', (request, response, next) => {
    try{
      response.json(getRepoJson(response));
    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get('/status.json', async (request, response, next) => {
    try {
      const { total, data } = await adapter.search({ index: 'status', type: 'status' });

      if(total === 0){
        logger.warning(`No data for statuses was found`);
      }

      const { timestamp, statuses } = _.omit( data[0], config.AGENCIES_TO_OMIT_FROM_STATUS );
      response.json({ total, timestamp, statuses });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get(`/status`, async (request, response, next) => {
    try {
      const { total, data } = await adapter.search({ index: 'status', type: 'status' });

      if(total === 0){
        response.render('status', { title: "Code.gov API Status", statusData: {} });
      }

      const filteredData = _.omit( data[0], config.AGENCIES_TO_OMIT_FROM_STATUS );
      response.render('status', { title: "Code.gov API Status", statusData: filteredData });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });

  router.get(`/status/:agency/issues`, async (request, response, next) => {
    try {
      let agency = request.params.agency.toUpperCase();
      const results = await adapter.search({ index: 'status', type: 'status' });

      if(results.total === 0){
        response.render('status/agency/issues', { title: `Code.gov API Status for ${agency}`, statusData: {} });
      }

      const data = _.omit( results.data[0], config.AGENCIES_TO_OMIT_FROM_STATUS );
      const agencyIssues = data.statuses[agency].issues;
      response.render('status/agency/issues', {
        title: `Code.gov API Status for ${agency}`,
        statusData: agencyIssues
      });

    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });
  router.get('/version', async (request, response, next) => {
    try {
      const versionInfo = await getVersion(response);
      response.json(versionInfo);
    } catch(error) {
      logger.trace(error);
      next(error);
    }
  });

  router.get('/', async (request, response, next) => {
    try {
      const rootMessage = await getRootMessage();
      response.json(rootMessage);
    } catch(error){
      logger.trace(error);
      next(error);
    }
  });

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
