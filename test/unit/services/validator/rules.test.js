require('chai').should();
const RulesEngine = require('simple-rules-engine');
const getRules = require('../../../../services/validator/rules');

describe('get rules', function () {
  it('should return a rules array', function () {
    const rules = getRules();

    rules.should.be.a('array');
  });
});

describe('run rules', function () {
  it('should return the passed repo with the propper score', function () {
    const engine = new RulesEngine(getRules());
    const repo = {
      "name": "project a",
      "description": "Project A for tests",
      "organization": "organization A",
      "permissions": {
        "licenses": [
          {
            "name": "MIT",
            "URL": "https://choosealicense.com/licenses/mit/"
          }
        ],
        "usageType": "governmentWideReuse",
        "exemptionText": null
      },
      "tags": [
        "GSA",
        "Search.gov",
        "search",
        "SaaS"
      ],
      "contact": {
        "name": "Somebody Somewhere",
        "email": "somebody@somewhere.com",
        "URL": "http://example.com",
        "phone": "555-555-5555"
      },
      "repositoryURL": "https://github.com/gsa/code-gov-api",
      "laborHours": 0,
      "organization": "GSA",
      "languages": [ "python", "javascript" ],
      "homepageURL": "https://github.com",
      "downloadURL": "https://github.com",
      "vcs": "git",
      "date.created": "2018-01-01 01:01:01",
      "date.lastModified": "2018-01-01 01:01:01",
      "date.metadataLastUpdated": "2018-01-01 01:01:01",
      "version": "1.0.0",
      "status": "alpha",
      "disclaimerURL": "https://example.com",
      "disclaimerText": "This is just a test text.",
      "relatedCode.name": "related-code-a",
      "relatedCode.URL": "https://relatedcodea.com",
      "reusedCode.name": "reused-code-a",
      "reusedCode.URL": "https://reusedcodea.com",
      "partners.name": "Partner A",
      "partners.email": "partner@parner-mail.com",
      "target_operating_systems": "Linux",
      "additional_information": {
        "additional_notes": "This is a test"
      }
    }

    return engine.execute(repo).then(target => {
      target.score.should.be.equal(16.2);
    });
  });
});