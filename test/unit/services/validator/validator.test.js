const chai = require('chai'),
  should = chai.should();

const { getValidator } = require('../../../../services/validator');

describe('Validator service', function() {

  describe('version 1.0.1', function() {
    let testCodeJson101;

    before(function() {
      testCodeJson101 = {
        "version": "1.0.1",
        "agency": "GSA",
        "projects": [
          {
            "name": ".Gov-Content-as-an-API",
            "repository": "https://github.com/GSA/.Gov-Content-as-an-API",
            "description": "Standards, Tools, and Guidance for offering web content as a web service",
            "license": null,
            "organization": "GSA",
            "openSourceProject": 1,
            "governmentWideReuseProject": 1,
            "contact": {
              "email": "github-admins@gsa.gov"
            },
            "tags": [
              "GSA"
            ]
          }
        ]
      };
    });

    describe('Get Validator', function() {
      it('Should return a Validator for version 1.0.1', function() {
        const validator = getValidator(testCodeJson101);
        validator._version.should.be.equal("1.0.1");
      });
      it('Should have relaxed validator function', function() {
        const validator = getValidator(testCodeJson101);
        validator.validators.repo.relaxed.should.be.a('function');
      });
      it('Should have strict validator function', function() {
        const validator = getValidator(testCodeJson101);
        validator.validators.repo.strict.should.be.a('function');
      });
      it('Should have enhanced validator function', function() {
        const validator = getValidator(testCodeJson101);
        validator.validators.repo.enhanced.should.be.a('function');
      });
    });
    describe('validateRepo', function() {
      it('Should return no erorrs', function() {
        const validator = getValidator(testCodeJson101);
        const repo = testCodeJson101.projects[0];
        const agency = {
          "id": 25,
          "name": "Consumer Financial Protection Bureau",
          "acronym": "CFPB",
          "website": "https://consumerfinance.gov/",
          "codeUrl": "https://consumerfinance.gov/code.json",
          "requirements": {
            "agencyWidePolicy": null,
            "openSourceRequirement":null,
            "inventoryRequirement":null
          }
        };
        const errors = validator.validateRepo(repo, agency, (error, results)=> {
          results.issues.errors.length.should.be.equal(0)
        });
      });

      it('Should return 1 error', function() {
        const validator = getValidator(testCodeJson101);
        const repo = {
          "name": ".Gov-Content-as-an-API",
          "description": "Standards, Tools, and Guidance for offering web content as a web service",
          "license": null,
          "organization": "GSA",
          "openSourceProject": 1,
          "governmentWideReuseProject": 1,
          "contact": {
            "email": "github-admins@gsa.gov"
          },
          "tags": [
            "GSA"
          ]
        };
        const agency = {
          "id": 25,
          "name": "GSA",
          "acronym": "CFPB",
          "website": "https://gsa.gov/",
          "codeUrl": "https://gsa.gov/code.json",
          "requirements": {
            "agencyWidePolicy": null,
            "openSourceRequirement":null,
            "inventoryRequirement":null
          }
        };
        const errors = validator.validateRepo(repo, agency, (error, results)=> {
          results.issues.errors.length.should.be.equal(1)
        });
      });
    });
  });

  describe('version 2.0.0', function() {
    let testCodeJson200;
    before(function() {
      testCodeJson200 = {
        "version": "2.0.0",
        "agency": "USDOT",
        "measurementType": {
            "method": "projects"
        },
        "releases": [
          {
            "name": "Air Carrier Traffic",
            "organization": "OST",
            "description": "Air Carrier Traffic Statistics -Features",
            "vcs": "Acquia",
            "status": "Production",
            "repositoryURL": "https://svn-1745.prod.hosting.acquia.com/dotrita/trunk/docroot/sites/all/modules/custom/air_carrier_traffic_statistics/",
            "permissions": {
              "licenses": [{
                "URL": "https://github.com/GSA/code-gov-api/blob/master/LICENSE.md",
                "name": "Yes"
              }],
              "usageType": "openSource",
              "exemptiontext": "null"
            },
            "tags": ["transportation", "code"],
            "laborHours": 0,
            "contact": {
              "email": "rachel.tayllor@dot.gov",
              "name": "Rachel Taylor",
              "URL": "https://www.transportation.gov/",
              "phone": "2023663000"
            }
          },
          {
            "name": "Air Travel Price Index",
            "organization": "OST",
            "description": "Air Travel Price Index (ATPI)-Features",
            "vcs": "Acquia",
            "status": "Production",
            "repositoryURL": "https://svn-1745.prod.hosting.acquia.com/dotrita/trunk/docroot/sites/all/modules/custom/air_travel_price_index/",
            "tags": ["transportation", "code"],
            "laborHours": 0,
            "contact": {
              "email": "rachel.tayllor@dot.gov",
              "name": "Rachel Taylor",
              "URL": "https://www.transportation.gov/",
              "phone": "2023663000"
            }
          }
        ]
      };
    });

    describe('Get Validator', function() {
      it('Should return a Validator for version 2.0.0', function() {
        const validator = getValidator(testCodeJson200);
        validator._version.should.be.equal("2.0.0");
      });
      it('Should have relaxed validator function', function() {
        const validator = getValidator(testCodeJson200);
        validator.validators.repo.relaxed.should.be.a('function');
      });
      it('Should have strict validator function', function() {
        const validator = getValidator(testCodeJson200);
        validator.validators.repo.strict.should.be.a('function');
      });
      it('Should have enhanced validator function', function() {
        const validator = getValidator(testCodeJson200);
        validator.validators.repo.enhanced.should.be.a('function');
      });
    });
    describe('validateRepo', function() {
      it('Should return no erorrs', function() {
        const validator = getValidator(testCodeJson200);
        const repo = testCodeJson200.releases[0];
        const agency = {
          "id": 1,
          "name": "US Department of Transportation",
          "acronym": "USDOT",
          "website": "https://www.transportation.gov/",
          "codeUrl": "https://www.transportation.gov/sites/dot.gov/files/docs/code.json",
          "requirements": {
            "agencyWidePolicy": null,
            "openSourceRequirement":null,
            "inventoryRequirement":null
          }
        };
        const errors = validator.validateRepo(repo, agency, (error, results)=> {
          results.issues.errors.length.should.be.equal(0)
        });
      });

      it('Should return 1 error', function() {
        const validator = getValidator(testCodeJson200);
        const repo = testCodeJson200.releases[1];
        const agency = {
          "id": 25,
          "name": "GSA",
          "acronym": "CFPB",
          "website": "https://gsa.gov/",
          "codeUrl": "https://gsa.gov/code.json",
          "requirements": {
            "agencyWidePolicy": null,
            "openSourceRequirement":null,
            "inventoryRequirement":null
          }
        };
        const errors = validator.validateRepo(repo, agency, (error, results)=> {
          results.issues.errors.length.should.be.at.least(1)
        });
      });
    });
  });
});
