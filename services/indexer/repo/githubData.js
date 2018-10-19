const getConfig = require('../../../config');
const Logger = require('../../../utils/logger');
const BodyBuilder = require('bodybuilder');
const config = getConfig(process.env.NODE_ENV);
const integrations = require('@code.gov/code-gov-integrations');
const Utils = require('../../../utils');

function getBody(from, size) {
  const bodybuilder = new BodyBuilder();
  return bodybuilder
    .from(from)
    .size(size)
    .aggregation('max', 'score', 'max_data_score' )
    .aggregation('min', 'score', 'min_data_score' )
    .build();
}

async function getRepos({from=0, size=100, collection=[], adapter}) {
  let body = getBody(from, size);

  const {total, data} = await adapter.search({ index: 'repos', type: 'repo', body});
  const delta = total - from;

  if(delta < size) {
    return {total, data: collection };
  }
  from += size;

  return await getRepos({ from, size, collection: collection.concat(data), adapter });
}

async function getGithubData(adapter, repoIndexInfo) {
  const elasticSearchAdapter = new adapter({ hosts: config.ES_HOST, logger: Logger });
  const logger = new Logger({name: 'get-gh-data'});
  const ghClient = integrations.github.getClient({
    type: config.GITHUB_AUTH_TYPE,
    token: config.GITHUB_TOKEN
  });

  logger.info('Fetching repos');
  const {total, data} = await getRepos({from:0, size: 100, adapter: elasticSearchAdapter});
  logger.debug(`Fetched ${total} repos.`);
  let totalUpdated = 0;
  try {
    logger.info(`Fetching Github data.`);
    for(let repo of data) {
      if(repo.repositoryURL && Utils.isGithubUrl(repo.repositoryURL)) {
        const {owner, repo: ghRepo} = Utils.parseGithubUrl(repo.repositoryURL);
        let ghData = {};

        try {
          logger.debug(`Getting github data for ${repo.repoID}`);
          ghData = await integrations.github.getData(owner, ghRepo, ghClient);

          repo.ghDescription = ghData.description;
          repo.forks = ghData.forks_count;
          repo.watchers = ghData.watchers_count;
          repo.stars = ghData.stargazers_count;
          repo.title = ghData.title;
          repo.topics = ghData.topics;
          repo.ghFullName = ghData.full_name;
          repo.hasIssues = ghData.has_issues;
          repo.ghOrganization = ghData.organization;
          repo.sshUrl = ghData.ssh_url;
          repo.ghCreatedAt = ghData.created_at;
          repo.ghUpdatedAt = ghData.updated_at;
          repo.readme = ghData.readme;
          repo.ghLanguages = ghData.languages;
          repo.issues = ghData.issues;
          repo.contributors = ghData.contributors;
          repo.remoteVcs = 'github';

          await elasticSearchAdapter.updateDocument({
            index: repoIndexInfo.esIndex,
            type: 'repo',
            id: repo.repoID,
            document: repo
          });
          totalUpdated += 1;
        } catch(error) {
          logger.error(error);
        }
      }
    }
    logger.info(`Updated ${totalUpdated} repos`);
  } catch(error) {
    throw error;
  }
}

module.exports = {
  getGithubData
};
