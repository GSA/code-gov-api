const Logger = require('../../../utils/logger');
const BodyBuilder = require('bodybuilder');
const adapters = require('@code.gov/code-gov-adapter');

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch-adapter";
  }
}
function getBody(from, size) {
  const bodybuilder = new BodyBuilder();
  return bodybuilder
    .from(from)
    .size(size)
    .aggregation('max', 'score', 'max_data_score' )
    .aggregation('min', 'score', 'min_data_score' )
    .build();
}
function normalizeScores(data, maxScore, minScore) {
  return data.map(item => {
    const normalizedScore = (item.score - minScore) / (maxScore - minScore) * 10;
    item.score = normalizedScore.toFixed(1);
    return item;
  });
}
async function getRepos({from=0, size=100, collection=[], adapter, index, type}) {
  let body = getBody(from, size);

  const {total, data, aggregations} = await adapter.search({ index, type, body });

  const normalizedData = normalizeScores(data, aggregations.max_data_score.value, aggregations.min_data_score.value);

  const delta = total - from;

  if(delta < size) {
    return {total, data: collection, aggregations };
  }
  from += size;

  return await getRepos({ from, size, collection: collection.concat(normalizedData), adapter, index, type });
}

async function normalizeRepoScores({index, type, config}) {
  const elasticSearchAdapter = new adapters.elasticsearch.ElasticsearchAdapter({
    hosts: config.ES_HOST,
    logger: ElasticSearchLogger
  });
  const logger = new Logger({ name: 'data-score-normalizer' });

  logger.info('Fetching repos');
  const {total, data} = await getRepos({from:0, size: 100, adapter: elasticSearchAdapter, index, type});
  logger.debug(`Fetched ${total} repos`);

  try {
    for(let repo of data) {
      await elasticSearchAdapter.updateDocument({
        index,
        type,
        id: repo.repoID,
        document: repo
      });
    }
    logger.info(`Updated ${total} repos`);
  } catch(error) {
    throw error;
  }
}

module.exports = {
  normalizeRepoScores
};
