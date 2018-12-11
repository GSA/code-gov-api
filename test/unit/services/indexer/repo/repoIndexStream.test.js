const JsonFile = require('jsonfile');
const path = require('path');

const RepoIndexer = require('../../../../../services/indexer/repo');
const RepoIndexerStream = require('../../../../../services/indexer/repo/RepoIndexStream')
function MockAdapter() {
  this._indexRepo = () => {
    return this.indexDocument();
  }
  this.indexDocument = async () => {
    return {
      "_id": "1",
      "_index": "repo",
      "_type": "repo",
      "_version": 1,
      "created": true
    };
  }
}

describe('Index given repo', function(done) {
  let agencyJsonStream;
  let testDataDir;
  let fallbackDataDir;
  let fetchDataDir;
  let agency;
  let indexer;

  const ES_MAPPING = require("../../../../../indexes/repo/mapping.json");
  const ES_SETTINGS = require("../../../../../indexes/repo/settings.json");
  const ES_PARAMS = {
    "esAlias": "repos",
    "esType": "repo",
    "esMapping": ES_MAPPING,
    "esSettings": ES_SETTINGS,
    "esHosts": "http://locahost:9200"
  };

  before(function() {
    testDataDir = path.join(path.dirname(path.dirname(path.dirname(__dirname))), '/test_data');
    fallbackDataDir = path.join(testDataDir, '/fallback');
    fetchDataDir = fallbackDataDir; // Same as abouve, we will not be going through all the file fetch flow.
    agency = JsonFile.readFileSync(path.join(testDataDir, 'test_agency_metadata.json'))

    indexer = new RepoIndexer({
      adapter: MockAdapter,
      agencyEndpointsFile: agency,
      fetchedFilesDir: fetchDataDir,
      fallbackFilesDir: fallbackDataDir,
      params: ES_PARAMS
    });
  });

  it('should index repo and return result', function(done) {
    // Call _write directly to test indexing the repo
    const repoIndexerStream = new RepoIndexerStream(indexer);
    const repo = {
      name: 'Save Mail',
      organization: 'FAKE_ORG',
      description: 'FAKE Gmail extension to save messages to local disk',
      license: null,
      openSourceProject: 0,
      governmentWideReuseProject: 0,
      tags: ['save', 'mail'],
      contact: { email: 'fake@fake.gov', name: 'Derp Fakerson', phone: '5555555555' },
      status: 'Production',
      vcs: 'git',
      homepage: 'https://github.com/FAKEGOV/FAKEMailSaveMessageExtension-',
      downloadURL: 'https://github.com/FAKE_ORG/FAKEMailSaveMessageExtension-/archive/master.zip',
      exemption: null,
      exemptionText: 'No exemption requested',
      updated: { lastCommit: '2017-04-11T04:00:00.000Z', metadataLastUpdated: '2017-04-22T04:00:00.000Z', lastModified: '2017-04-11' },
      agency: {
        name: 'Department of FAKE',
        acronym: 'FAKE',
        website: 'https://fake.gov/',
        codeUrl: '/FAKE.json',
        requirements: { agencyWidePolicy: 0, openSourceRequirement: 0, inventoryRequirement: 0, schemaFormat: 1, overallCompliance: 0 }
      },
      repoID: 'fake_fake_org_save_mail'
    }
    const expectedResult = {
      "_id": "1",
      "_index": "repo",
      "_type": "repo",
      "_version": 1,
      "created": true
    }
    repoIndexerStream._write(repo, 'utf-8', (err, response) => {
      if(err) {
        done(err);
      }
      response.should.be.deep.equal(expectedResult);
    });
    done();
  });
});