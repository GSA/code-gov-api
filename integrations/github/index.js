const Octokit = require('@octokit/rest');
const {
  pause,
  backoff,
  getLabelValue,
  getWaitTime,
  paginate
} = require('./utils');

function _parseGithubUrl(githubUrl) {
  const githubUrlRegEx = /github.com/
  const match = githubUrl.match(githubUrlRegEx);

  if (match) {
    const githubUserAndRepo = match['input'].split('/').slice(-2);
    return {
      githubUser: githubUserAndRepo[0],
      repoName: githubUserAndRepo[1]
    };
  } else {
    throw new Error('URL is not a valid Github URL.');
  }
}

/**
 * Creates an authenticated instance of a Github client.
 * @param {number} timeout - Timeout value for Github client requests in seconds. Default of 5.
 * @param {string} token - The token to use for Github authentication. This token must be created in Github.
 * @returns {Object} Authenticated Github client instance.
 */
function getGithubClient(type='token', token='') {
  const octokit = new Octokit();

  octokit.authenticate({ type: 'token', token });

  return octokit;
}

/**
 * Validates if passed url is a well formed Github URL.
 * Eg. https://github.com/GSA/code-gov-api
 * @param {string} url - URL to validate.
 * @returns {boolean}
 */
function isGithubUrl(url) {
  const githubRegEx = /(git@|(https|http):\/\/)github.com(:|\/)/;
  let passed = false;
  try {
    const matches = url.match(githubRegEx);

    if(matches) {
      passed = true;
    }
  } catch(error) {
    passed = false;
  }

  return passed;
}

/**
 * Gets all the contributors for a specific Github repository.
 * @param {Object} githubClient - Authenticated Github client
 * @param {Object} options - Options to pass to Github client
 * @param {string} options.repoName - Name of the Github repository
 * @param {string} options.githubUser - Github user that is the owner of the repository
 * @param {number} options.perPage - Number of results per response page.
 * @returns {Promise} Promise object represents a list of all contributors
 */
async function getContributors({githubClient, options} ) {
  const repoContributorsResponse = await paginate(githubClient, githubClient.repos.getContributors, {
    owner: options.githubUser,
    repo: options.repoName,
    per_page: options.perPage
  });

  return repoContributorsResponse.map(contibutor => {
    return {
      userName: contibutor.login,
      githubProfile: contibutor.url,
      contributions: contibutor.contributions
    }
  });
}

async function getRepoInformation(githubClient, repoUrl, perPage, config, logger) {
  try {
    const { githubUser, repoName } = _parseGithubUrl(repoUrl);
    const repoInfo = await paginate(githubClient, githubClient.repos.get, {
      owner: githubUser,
      repo: repoName
    });

    const contributors = await getContributors({
      githubClient,
      options: { githubUser, repoName, perPage }
    });

    const issues = await getRepoIssues({
      githubClient,
      options: {
        githubUser,
        repoName,
        GITHUB_ISSUE_STATE: 'open',
        perPage,
        issueTypeRegEx: config.issueTypeRegEx,
        skillLevelRegEx: config.skillLevelRegEx,
        effortRegEx: config.effortRegEx,
        impactRegEx: config.impactRegEx,
        featuredRegEx: config.featuredRegEx,
        githubIssueState: config.GITHUB_ISSUE_STATE,
        githubIssueLabels: config.GITHUB_HELP_WANTED_ISSUE_LABELS
      }
    });
    return {
      name: repoInfo.name,
      description: repoInfo.description,
      homepage: repoInfo.homepage,
      stargazers_count: repoInfo.stargazers_count,
      issues_url: repoInfo.issues_url,
      license: repoInfo.license,
      repoLanguages: repoInfo.language,
      forks: repoInfo.forks,
      open_issues: repoInfo.open_issues,
      created_at: repoInfo.created_at,
      updated_at: repoInfo.updated_at,
      pushed_at: repoInfo.pushed_at,
      git_url: repoInfo.git_url,
      ssh_url: repoInfo.ssh_url,
      clone_url: repoInfo.clone_url,
      contributors: contributors,
      issues: issues
    };
  } catch(error) {
    logger.error('ERROR getting Github data.', error);
    return {};
  }
}

async function getRepoIssues({ githubClient, options }) {

  const issues =  await paginate(githubClient, githubClient.issues.getForRepo, {
    owner: options.githubUser,
    repo: options.repoName,
    state: options.githubIssueState,
    labels: options.githubIssueLabels,
    per_page: options.perPage
  });

  return issues.map(issue => {
    let issueType;
    let skillLevel;
    let effort;
    let impact;
    let featured;

    issue.labels.forEach(label => {
      if(label.name.match(options.issueTypeRegexp)) {
        issueType = getLabelValue(label.name, options.issueTypeRegexp)
      }
      if(label.name.match(options.skillLevelRegexp)) {
        skillLevel = getLabelValue(label.name, options.skillLevelRegexp)
      }
      if(label.name.match(options.effortRegexp)) {
        effort = getLabelValue(label.name, options.effortRegexp)
      }
      if(label.name.match(options.impactRegexp)) {
        impact = getLabelValue(label.name, options.impactRegexp)
      }
      if(label.name.match(options.featuredRegexp)) {
        featured = getLabelValue(label.name, options.featuredRegexp)
      }
    });

    return {
      url: issue.html_url,
      repository_url: issue.repository_url,
      title: issue.title,
      state: issue.state,
      labels: issue.labels,
      issueType: issueType || null,
      skillLevel: skillLevel || null,
      effort: effort || null,
      impact: impact || null,
      featured: featured || null
    }
  });
}

module.exports = {
  getRepoInformation,
  getGithubClient,
  isGithubUrl
};
