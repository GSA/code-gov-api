const { getRepoInformation,
  getRepoIssues } = require('../integrations');
const dotenv = require('dotenv');
const chai = require('chai'),
  should = chai.should();

dotenv.config()

describe('Get Github repository information', function() {
  let githubConfig;
  let githubUrl;
  before(function() {
    githubConfig = {
      authType: 'token',
      githubToken: process.env.GH_TOKEN,
      githubLabels: 'help wanted'
    };
    githubUrl = 'https://github.com/GSA/code-gov-api';
  })
  it('should return code-gov-api information', function(done){
    getRepoInformation(githubUrl, githubConfig)
      .then(result => {
        console.log(result)
        result.repoInfo.name.should.equal('code-gov-api')
      }).then(done, done);
  });
  it('should return repository issues', function(done) {
    getRepoIssues(githubUrl, githubConfig)
      .then(issues => {
        issues.should.be.a('array');
      }).then(done, done);
  });
});