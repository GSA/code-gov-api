const Utils = require('../../utils');
const should = require('chai').should();

describe('Testing Utils module', function () {

  describe('flatten mapping properties', function () {
    let mappings;
    before(function () {
      mappings = require('../../indexes/repo/mapping.json');
    });

    it('should return a flattened versions of the passed mapping object using getFlattenedMappingPropertiesByType', function () {
      const expected = {
        "text": [
          'repo.agency.name',
          'repo.measurementType.ifOther',
          'repo.name',
          'repo.organization',
          'repo.description',
          'repo.events',
          'repo.tags',
          'repo.languages',
          'repo.contact.name',
          'repo.contact.email',
          'repo.contact.twitter',
          'repo.contact.phone',
          'repo.partners.name',
          'repo.partners.email',
          'repo.permissions.licenses.name',
          'repo.permissions.usageType',
          'repo.permissions.exemptionText',
          'repo.relatedCode.name',
          'repo.reusedCode.name',
          'repo.disclaimerText'
        ],
        "keyword": [
          'repo.repoID',
          'repo.agency.acronym',
          'repo.agency.website',
          'repo.agency.codeUrl',
          'repo.measurementType.method',
          'repo.status',
          'repo.vcs',
          'repo.repositoryURL',
          'repo.targetOperatingSystems',
          'repo.version',
          'repo.homepageURL',
          'repo.downloadURL',
          'repo.permissions.licenses.URL',
          'repo.relatedCode.URL',
          'repo.reusedCode.URL',
          'repo.disclaimerURL',
        ],
        "nested": [
          'repo.partners',
          'repo.permissions.licenses',
          'repo.relatedCode',
          'repo.reusedCode',
        ],
        "float": [
          'repo.agency.requirements.agencyWidePolicy',
          'repo.agency.requirements.openSourceRequirement',
          'repo.agency.requirements.inventoryRequirement',
          'repo.agency.requirements.schemaFormat',
          'repo.agency.requirements.overallCompliance'
        ],
        "integer": [
          'repo.score',
          'repo.laborHours'
        ],
        "object": [
          'repo.additionalInformation',
        ],
        "date": [
          'repo.date.created',
          'repo.date.lastModified',
          'repo.date.metadataLastUpdated',
        ]
      };

      Utils.getFlattenedMappingPropertiesByType(mappings)
        .should.be.deep.equal(expected);
    });
  });
  describe('omit keys', function () {
    let testObject;

    beforeEach(function () {
      testObject = {
        '_id': '20394uq',
        'name': 'Froilan Irizarry',
        'email': 'persona@somewhere.com',
        'age': 36
      };
    })
    it('should return object without the excluded keys using omitDeepKeys', function () {
      const excludeKeys = ['age']
      const expectedObject = {
        '_id': '20394uq',
        'name': 'Froilan Irizarry',
        'email': 'persona@somewhere.com'
      };
      Utils.omitDeepKeys(testObject, excludeKeys)
        .should.be.deep.equal(expectedObject);
    });
    it('should return object without private keys (begin with _) using omitPrivateKeys', function () {
      const expectedObject = {
        'name': 'Froilan Irizarry',
        'email': 'persona@somewhere.com',
        'age': 36
      };
      Utils.omitPrivateKeys(testObject)
        .should.be.deep.equal(expectedObject);
    });
  });
  describe('getLoggerRequestSerializer', function() {
    it('should return object with x-api-key removed', function() {
      const fauxRequest = {
        id: '1',
        method: 'GET',
        url: 'http://localhost:3000',
        headers: {
          'x-api-key': 'oh-no-tis-a-token',
          'content-type': 'application/json',
          'user-agent': 'tests'
        },
        connection: {
          remoteAddress: 'localhost',
          remotePort: '3000'
        }
      };
      const expected = {
        id: '1',
        method: 'GET',
        url: 'http://localhost:3000',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'tests'
        },
        remoteAddress: 'localhost',
        remotePort: '3000'
      };
      Utils.getLoggerRequestSerializer(fauxRequest).should.be.deep.equal(expected);
    });
  });
  describe('getLoggerResponseSerializer', function() {
    it('should return object with x-api-key removed', function() {
      const fauxResponse = {
        statusCode: 200,
        _header: {
          'x-api-key': 'oh-no-tis-a-token',
          'content-type': 'application/json',
          'user-agent': 'tests'
        }
      };
      const expected = {
        statusCode: 200,
        header: {
          'content-type': 'application/json',
          'user-agent': 'tests'
        }
      };
      Utils.getLoggerResponseSerializer(fauxResponse).should.be.deep.equal(expected);
    });
  });
})
