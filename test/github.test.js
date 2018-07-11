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
        result.name.should.equal('code-gov-api')
        result.homepage.should.equal('http://code.gov')
      }).then(done, done);
  });
  it('should return repository issues', function(done) {
    getRepoIssues(githubUrl, githubConfig)
      .then(issues => {
        console.log(issues);
        issues.should.be.a('array');
      }).then(done, done);
  });
});