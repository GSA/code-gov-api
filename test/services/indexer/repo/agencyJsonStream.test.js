const fs = require('fs');
const path = require('path');

const chai = require('chai');
const JsonStream = require('JSONStream');
const JsonFile = require('jsonfile');
const should = chai.should();

const AgencyJsonStream = require('../../../../services/indexer/repo/AgencyJsonStream');

describe('AgencyJsonStream', function() {
  let agencyJsonStream;
  let testDataDir;
  let fallbackDataDir;
  let fetchDataDir;
  let agency;

  beforeEach(function() {
    testDataDir = path.join(__dirname, '/test_data');
    fallbackDataDir = path.join(testDataDir, '/fallback');
    fetchDataDir = path.join(testDataDir, '/fetched');
    agency = JsonFile.readFileSync(path.join(testDataDir, 'test_agency_endpoints.json'))
    agencyJsonStream = new AgencyJsonStream(fetchDataDir, fallbackDataDir);
  });

  it('Should save codeJson to disk', function() {
    const codeJson = JsonFile.readFileSync(path.join(fallbackDataDir, '/FAKE.json'));

    return agencyJsonStream._saveFetchedCodeJson('FAKE', codeJson)
      .then(data =>{
        const fetchedCodeJson = JsonFile.readFileSync(path.join(fetchDataDir, '/FAKE.json'));
        data.should.be.deep.equal(fetchedCodeJson);
      });
  });

  it('Should return codejson from disk', function() {
    const codeJson = JsonFile.readFileSync(path.join(fallbackDataDir, '/FAKE.json'));
    return agencyJsonStream._getAgencyCodeJson(agency[0])
      .then(data => {
        data.should.be.deep.equal(codeJson);
      });
  });

  it('Should return array of repos', function(){
    const codeJson = JsonFile.readFileSync(path.join(fallbackDataDir, '/FAKE.json'));
    const expectedRepos = codeJson.projects;
    return agencyJsonStream._validateAgencyRepos(agency[0], codeJson)
      .then(result => {
        result.repos.should.be.deep.equal(expectedRepos);
      });
  });

  it.only('Should return fomatted repos', function(done){
    const expectedRepo = {
      name: 'Save Mail',
      organization: 'FAKE_ORG',
      description: 'FAKE Gmail extension to save messages to local disk',
      permissions: {
        licenses: [{
          URL: '',
          name: ''
        }],
        usageType: 'openSource',
        exemptionText: null
      },
      tags: ['save', 'mail'],
      contact: { email: 'fake@fake.gov', name: 'Derp Fakerson', phone: '5555555555' },
      status: 'Production',
      vcs: 'git',
      homepageURL: 'https://github.com/FAKEGOV/FAKEMailSaveMessageExtension-',
      downloadURL: 'https://github.com/FAKE_ORG/FAKEMailSaveMessageExtension-/archive/master.zip',
      updated: { lastCommit: '2017-04-11T00:00:00.000Z', metadataLastUpdated: '2017-04-22T00:00:00.000Z', lastModified: '2017-04-11' },
      agency: {
        name: 'Department of FAKE',
        acronym: 'FAKE',
        website: 'https://fake.gov/',
        codeUrl: '/FAKE.json',
        requirements: { agencyWidePolicy: 0, openSourceRequirement: 0, inventoryRequirement: 0, schemaFormat: 1, overallCompliance: 0 }
      },
      repoID: 'fake_fake_org_save_mail' 
    }
    const codeJson = JsonFile.readFileSync(path.join(fallbackDataDir, '/FAKE.json'));
    const agencyStream = fs.createReadStream(path.join(testDataDir, 'test_agency_endpoints.json'));
    const jsonStream = JsonStream.parse('*');

    agencyStream.pipe(jsonStream).pipe(agencyJsonStream).on('data', (repos) => {
      repos.should.be.deep.equal(expectedRepo);
      done();
    }).on('error', (error) => done(error));
  });

  describe('Compliance Calculations', function() {
    it('Should return 0', function() {
      const expectedValue = 0;
      const requirements = {
        agencyWidePolicy: 0,
        openSourceRequirement: 0,
        inventoryRequirement: 0
      };
      const overallCompliance = agencyJsonStream._calculateOverallCompliance(requirements);

      overallCompliance.should.be.equal(expectedValue);
    });
    it('Should return 1', function() {
      const expectedValue = 1;
      const requirements = {
        agencyWidePolicy: 1,
        openSourceRequirement: 1,
        inventoryRequirement: 1
      };
      const overallCompliance = agencyJsonStream._calculateOverallCompliance(requirements);

      overallCompliance.should.be.equal(expectedValue);
    });
    it('Should return the mean of all values passed', function() {
      const expectedValue = 1.3333333333333333;
      const requirements = {
        agencyWidePolicy: 1,
        openSourceRequirement: 1,
        inventoryRequirement: 2
      };
      const overallCompliance = agencyJsonStream._calculateOverallCompliance(requirements);

      overallCompliance.should.be.equal(expectedValue);
    });
  });
});