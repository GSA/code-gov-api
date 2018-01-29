const Octokit = require('@octokit/rest');

function _parseGithubUrl(githubUrl) {
  const githubUrlRegEx = /github.com/
  const match = githubUrl.match(githubUrlRegEx);
  let githubUser;
  let repoName;

  if (match) {
    githubUser = match['input'].split('/')[3];
    repoName = match['input'].split('/')[4];
  } else {
    throw new Error('URL is not a valid Github URL.');
  }
  return { githubUser, repoName }
}

function _getGithubClient(config) {
  const octokit = Octokit();

  octokit.authenticate({
    type: config.authType,
    token: config.githubToken
  });

  return octokit;
}

async function getRepoInformation(repoUrl, config) {
  const githubClient = _getGithubClient(config);
  
  const { githubUser, repoName } = _parseGithubUrl(repoUrl);
  const repoInfo = await githubClient.repos.get({
    owner: githubUser,
    repo: repoName
  });
  const repoLanguages = await githubClient.repos.getLanguages({
    owner: githubUser,
    repo: repoName
  });

  return {
    repoInfo,
    name: repoInfo.data.name,
    repoLanguages: repoLanguages.data
  };
}

function getRepoIssues(repoUrl, config) {
  const githubClient = _getGithubClient(config);

  const { githubUser, repoName } = _parseGithubUrl(repoUrl);
  return githubClient.issues.getForRepo({
    owner: githubUser,
    repo: repoName,
    state: 'open',
    labels: config.githubLabels
  }).then(info => info.data);
}

module.exports = {
  getRepoInformation,
  getRepoIssues
};
