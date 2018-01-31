const Octokit = require('@octokit/rest');

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

function _getGithubClient(options) {
  const octokit = Octokit();

  octokit.authenticate({
    type: options.GITHUB_AUTH_TYPE,
    token: options.GITHUB_TOKEN
  });

  return octokit;
}

function _getLabelValue(label, regExp) {
  let match = label.match(regExp);
  return match['input'].split(' ')[1] || null;
}

async function getRepoInformation(repoUrl, options) {
  const githubClient = _getGithubClient(options);
  
  const { githubUser, repoName } = _parseGithubUrl(repoUrl);
  const repoInfo = await githubClient.repos.get({
    owner: githubUser,
    repo: repoName
  }).then(repoInfo => repoInfo.data);
  const repoContributors = await githubClient.repos.getContributors({
    owner: githubUser,
    repo: repoName
  }).then(contributors => {
    return contributors.data.map(contibutor => {
      return {
        userName: contibutor.login,
        githubProfile: contibutor.url,
        contributions: contibutor.contributions
      }
    });
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
    contributors: repoContributors
  };
}

async function getRepoIssues(repoUrl, options) {
  const githubClient = _getGithubClient(options);

  const { githubUser, repoName } = _parseGithubUrl(repoUrl);
  const issues =  await githubClient.issues.getForRepo({
    owner: githubUser,
    repo: repoName,
    state: options.GITHUB_ISSUE_STATE,
    labels: options.GITHUB_ISSUE_LABELS
  }).then(info => info.data);

  return issues.map(issue => {
    let issueType;
    let skillLevel;
    let effort;
    let impact;
    let featured;

    issue.labels.forEach(label => {
      if(label.name.match(options.ISSUE_TYPE_REGEXP)) {
        issueType = _getLabelValue(label.name, options.ISSUE_TYPE_REGEXP)
      }
      if(label.name.match(options.SKILL_LEVEL_REGEXP)) {
        skillLevel = _getLabelValue(label.name, options.SKILL_LEVEL_REGEXP)
      }
      if(label.name.match(options.EFFORT_REGEXP)) {
        effort = _getLabelValue(label.name, options.EFFORT_REGEXP)
      }
      if(label.name.match(options.IMPACT_REGEXP)) {
        impact = _getLabelValue(label.name, options.IMPACT_REGEXP)
      }
      if(label.name.match(options.FEATURED_REGEXP)) {
        featured = _getLabelValue(label.name, options.FEATURED_REGEXP)
      }
    });

    return {
      url: issue.html_url,
      repository_url: issue.repository_url,
      title: issue.title,
      state: issue.state,
      labels: issue.labels,
      issueType: issueType,
      skillLevel: skillLevel,
      effort: effort,
      impact: impact,
      featured: featured
    }
  });
}

module.exports = {
  getRepoInformation,
  getRepoIssues
};
