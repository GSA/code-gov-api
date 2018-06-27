const fs = require('fs');
const path = require('path');

const chai = require('chai');
const JsonStream = require('JSONStream');
const JsonFile = require('jsonfile');
const should = chai.should();
const moment = require('moment');

const AgencyJsonStream = require('../../../../../services/indexer/repo/AgencyJsonStream');

describe('AgencyJsonStream', function() {
  let agencyJsonStream;
  let testDataDir;
  let fallbackDataDir;
  let fetchDataDir;
  let agency;
  let config;

  beforeEach(function() {
    testDataDir = path.join(path.dirname(path.dirname(path.dirname(__dirname))), '/test_data');
    fallbackDataDir = path.join(testDataDir, '/fallback');
    fetchDataDir = path.join(testDataDir, '/fetched');
    agency = JsonFile.readFileSync(path.join(testDataDir, 'test_agency_metadata.json'));
    agencyJsonStream = new AgencyJsonStream(fetchDataDir, fallbackDataDir, {
      prod_envs: ['prod', 'production', 'stag', 'staging'],
      supportedSchemaVersions: [
        '1.0.0',
        '1.0.1',
        '2.0.0'
      ]
    });
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
      .then(result => result.repos.should.be.deep.equal(expectedRepos));
  });

  it('Should return fomatted repos', function(){
    const expectedFormattedRepo = [{
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
      laborHours: null,
      homepageURL: 'https://github.com/FAKEGOV/FAKEMailSaveMessageExtension-',
      downloadURL: 'https://github.com/FAKE_ORG/FAKEMailSaveMessageExtension-/archive/master.zip',
      agency: {
        name: 'Department of FAKE',
        acronym: 'FAKE',
        website: 'https://fake.gov/',
        codeUrl: 'https://fake.gov/FAKE.json',
        fallback_file: "/FAKE.json",
        requirements: { agencyWidePolicy: 0, openSourceRequirement: 0, inventoryRequirement: 0, schemaFormat: 1, overallCompliance: 0 },
        complianceDashboard: false
      },
      repositoryURL: '',
      disclaimerText: '',
      disclaimerURL: '',
      relatedCode: [{
        codeName: '',
        codeURL: '',
        isGovernmentRepo: false
      }],
      reusedCode: [{
        URL: '',
        name: ''
      }],
      targetOperatingSystems: ['other'],
      additionalInformation: {
        additionalNotes: null
      },
      date: {
        created: '',
        lastModified: moment('2017-04-11', 'YYYY-MM-DD').utc().toJSON(),
        metadataLastUpdated: moment('2017-04-22', 'YYYY-MM-DD').utc().toJSON()
      },
      repoID: 'fake_fake_org_save_mail'
    }]
    const codeJson = JsonFile.readFileSync(path.join(fallbackDataDir, '/FAKE.json'));

    return agencyJsonStream._formatRepos(agency[0], { schemaVersion: '1.0.1', repos: codeJson.projects })
      .then(repo => repo.should.be.deep.equal(expectedFormattedRepo));

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