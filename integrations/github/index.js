const GitHubApi = require("github");

const github = new GitHubApi({
  Promise: require("bluebird"),
  host: "api.github.com",
  protocol: "https",
  headers: {
    "user-agent": "code.gov"
  }
});

/**
 * Get basic repository information.
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Object} Object with basic repository information.
 */
function _getRepo(owner, repo) {
  return github.repos.get({
    owner: owner,
    repo: repo
  })
  .then(function (repo) {
    return {
      description: repo.description,
      watchers_count: repo.watchers_count,
      stargazers_count: repo.stargazers_count,
      language: repo.language,
      issues_url: repo.issues_url
    };
  });
}

/**
 * Gets all repository collaborators
 * @param {string} owner - repository owner
 * @param {string} repo - repository name
 * @returns {Object} Object with all collaborators and their basic information along with a count
 */
function _getCollaborators(owner, repo) {
  return github.repos.getCollaborators({
    owner: owner,
    repo: repo
  })
  .then((collabs) => {
    return {
      collaborators: collabs.data.map(function (collab) {
        return {
          userName: collab.login,
          url: collab.html_url,
          avatar_url: collab.avatar_url
        };
      }),
      total_collaborators: collabs.length
    };
  });
}

/**
 * Extracts the repository owner and repository name from a https github url
 * Eg. https://github.com/GSA/code-gov-api
 * @param {array} matchResults - array with the results from string.match
 * @returns {Object} Object with the repository's owner and name
 */
function getOwnerRepoHttpGithubUrl(matchResults) {
  const substringIndexStart = matchResults[0].length + (matchResults.index + 1)

  let parseResult = matchResults.input.substring(substringIndexStart).split('/')

  return {
    owner: parseResult[0],
    repo: parseResult[1]
  }

}

/**
 * Extracts the repository owner and repository name from a ssh github url
 * Eg. git@github.com:GSA/code-gov-api.git
 * @param {array} matchResults - array with the results from string.match
 * @returns {Object} Object with the repository's owner and name
 */
function getOwnerRepoSshGithubUrl(matchResults) {
  const substringIndexStart = matchResults[0].length + (matchResults.index + 1);

  let parseResult = matchResults.input.substring(substringIndexStart).split('/');

  return {
    owner: parseResult[0],
    repo: parseResult[1].substring(0, parseResult[1].length - 4) // Remove the .git from the end of the repo name
  };

}

/**
 * Extract owner and repository name from a Github url
 * @param {string} githubUrl - Accepts both http and ssh urls.
 * @returns {Object} Object with owner name and repository name or empty if url is not recognized.
 */
function _getOwnerRepo(githubUrl) {
  let matchResults = {};

  if ((matchResults = githubUrl.match(/^https:\/\/github.com/i)) !== null) {
    return getOwnerRepoHttpGithubUrl(matchResults);
  }

  if ((matchResults = githubUrl.match(/^git@github.com/i)) !== null) {
    return getOwnerRepoSshGithubUrl(matchResults);
  }

  return {};
}

/**
 * Get project infomation from Github from project's indicated repository url.
 * @param {object} data - Object with the project to search form in Github
 * @returns {object} Returns Github information for the given project
 */
function getRepoGithubInfo(data) {
  if (data.repository && data.repository.search(/github.com/i)) {
    github.authenticate({
      type: "oauth",
      token: process.env.GITHUB_TOKEN
    });
    const {owner, repo} = _getOwnerRepo(data.repository);

    Promise.all([
      _getRepo(owner, repo),
      _getCollaborators(owner, repo)
    ])
    .then((values) => {
      let githubInfo = {}
      values.forEach((value) => {
        if (value.collaborators) {
          githubInfo.collaborators = value.collaborators;
        } else {
          githubInfo.repoInfo = value;
        }
      });
  
      return githubInfo;
    })
    .catch((error) => {
      return {
        collaborators: [],
        repoInfo: {},
        error: {
          projectName: data.name,
          errorMessage: error
        }
      }
    });
  } else {
    return {
      collaborators: [],
      repoInfo: {},
      error: {
        projectName: data.name,
        errorMessage: 'Project has no repository URL. Can not retrieve Github infomation.'
      }
    }
  }
}

module.exports = getRepoGithubInfo;
