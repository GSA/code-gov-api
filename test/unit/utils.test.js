const Utils = require('../../utils');
const should = require('chai').should();

describe('Testing Utils module', function () {
  describe('transformStringToKey', function () {
    it('should return a latinized version of the text', function () {
      const testData = 'Code Gov API';
      const expected = 'code_gov_api';

      Utils.transformStringToKey(testData)
        .should.be.equal(expected);
    });
  });
  describe('flatten mapping properties', function () {
    let mappings;
    before(function () {
      mappings = require('./test_data/mappings/mapping_201.json');
    })
    it('should return a flattened versions of the passed mapping object using getFlattenedMappingProperties', function () {
      const expected = {
        'repo.repoID': 'string',
        'repo.agency.name': 'string',
        'repo.agency.acronym': 'string',
        'repo.agency.website': 'string',
        'repo.agency.codeUrl': 'string',
        'repo.agency.requirements.agencyWidePolicy': 'float',
        'repo.agency.requirements.openSourceRequirement': 'float',
        'repo.agency.requirements.inventoryRequirement': 'float',
        'repo.agency.requirements.schemaFormat': 'float',
        'repo.agency.requirements.overallCompliance': 'float',
        'repo.measurementType.method': 'string',
        'repo.measurementType.ifOther': 'string',
        'repo.status': 'string',
        'repo.vcs': 'string',
        'repo.repositoryURL': 'string',
        'repo.targetOperatingSystems': 'string',
        'repo.name': 'string',
        'repo.version': 'string',
        'repo.organization': 'string',
        'repo.homepageURL': 'string',
        'repo.downloadURL': 'string',
        'repo.description': 'string',
        'repo.events': 'string',
        'repo.tags': 'string',
        'repo.languages': 'string',
        'repo.contact.name': 'string',
        'repo.contact.email': 'string',
        'repo.contact.twitter': 'string',
        'repo.contact.phone': 'string',
        'repo.partners.name': 'string',
        'repo.partners.email': 'string',
        'repo.permissions.licenses.name': 'string',
        'repo.permissions.licenses.URL': 'string',
        'repo.permissions.usageType': 'string',
        'repo.permissions.exemptionText': 'string',
        'repo.laborHours': 'integer',
        'repo.relatedCode.name': 'string',
        'repo.relatedCode.URL': 'string',
        'repo.reusedCode.name': 'string',
        'repo.reusedCode.URL': 'string',
        'repo.disclaimerURL': 'string',
        'repo.disclaimerText': 'string',
        'repo.additionalInformation': 'object',
        'repo.date.created': 'date',
        'repo.date.lastModified': 'date',
        'repo.date.metadataLastUpdated': 'date',
        'status.last_data_harvest': 'date',
        'status.version': 'string',
        'status.agency.name': 'string',
        'status.agency.acronym': 'string',
        'status.agency.website': 'string',
        'status.agency.codeUrl': 'string',
        'status.agency.requirements.agencyWidePolicy': 'float',
        'status.agency.requirements.openSourceRequirement': 'float',
        'status.agency.requirements.inventoryRequirement': 'float',
        'status.agency.requirements.schemaFormat': 'float',
        'status.agency.requirements.overallCompliance': 'float',
        'status.issues.organization': 'string',
        'status.issues.project_name': 'string',
        'status.issues.errors.keyword': 'string',
        'status.issues.errors.dataPath': 'string',
        'status.issues.errors.schemaPath': 'string',
        'status.issues.errors.params': 'object',
        'status.issues.errors.message': 'string',
        'status.issues.warning.keyword': 'string',
        'status.issues.warning.dataPath': 'string',
        'status.issues.warning.schemaPath': 'string',
        'status.issues.warning.params': 'object',
        'status.issues.warning.message': 'string',
        'status.issues.enhancements.keyword': 'string',
        'status.issues.enhancements.dataPath': 'string',
        'status.issues.enhancements.schemaPath': 'string',
        'status.issues.enhancements.params': 'object',
        'status.issues.enhancements.message': 'string',
        'status.fallback_used': 'boolean'
      }
      Utils.getFlattenedMappingProperties(mappings)
        .should.be.deep.equal(expected);
    });

    it('should return a flattened versions of the passed mapping object using getFlattenedMappingPropertiesByType', function () {
      const expected = {
        string: [
          'repo.repoID',
          'repo.agency.name',
          'repo.agency.acronym',
          'repo.agency.website',
          'repo.agency.codeUrl',
          'repo.measurementType.method',
          'repo.measurementType.ifOther',
          'repo.status',
          'repo.vcs',
          'repo.repositoryURL',
          'repo.targetOperatingSystems',
          'repo.name',
          'repo.version',
          'repo.organization',
          'repo.homepageURL',
          'repo.downloadURL',
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
          'repo.permissions.licenses.URL',
          'repo.permissions.usageType',
          'repo.permissions.exemptionText',
          'repo.relatedCode.name',
          'repo.relatedCode.URL',
          'repo.reusedCode.name',
          'repo.reusedCode.URL',
          'repo.disclaimerURL',
          'repo.disclaimerText',
          'status.version',
          'status.agency.name',
          'status.agency.acronym',
          'status.agency.website',
          'status.agency.codeUrl',
          'status.issues.organization',
          'status.issues.project_name',
          'status.issues.errors.keyword',
          'status.issues.errors.dataPath',
          'status.issues.errors.schemaPath',
          'status.issues.errors.message',
          'status.issues.warning.keyword',
          'status.issues.warning.dataPath',
          'status.issues.warning.schemaPath',
          'status.issues.warning.message',
          'status.issues.enhancements.keyword',
          'status.issues.enhancements.dataPath',
          'status.issues.enhancements.schemaPath',
          'status.issues.enhancements.message'
        ],
        nested: [
          'repo.agency.requirements',
          'repo.partners',
          'repo.permissions.licenses',
          'repo.relatedCode',
          'repo.reusedCode',
          'repo.date',
          'status.issues',
          'status.issues.errors',
          'status.issues.warning',
          'status.issues.enhancements'
        ],
        float:
          ['repo.agency.requirements.agencyWidePolicy',
            'repo.agency.requirements.openSourceRequirement',
            'repo.agency.requirements.inventoryRequirement',
            'repo.agency.requirements.schemaFormat',
            'repo.agency.requirements.overallCompliance',
            'status.agency.requirements.agencyWidePolicy',
            'status.agency.requirements.openSourceRequirement',
            'status.agency.requirements.inventoryRequirement',
            'status.agency.requirements.schemaFormat',
            'status.agency.requirements.overallCompliance'
          ],
        integer: ['repo.laborHours'],
        object: [
          'repo.additionalInformation',
          'status.issues.errors.params',
          'status.issues.warning.params',
          'status.issues.enhancements.params'
        ],
        date: [
          'repo.date.created',
          'repo.date.lastModified',
          'repo.date.metadataLastUpdated',
          'status.last_data_harvest'
        ],
        boolean: ['status.fallback_used']
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
  describe('getCodeJsonVersion', function() {
    let codeJson;
    before(function() {
      codeJson = require('./test_data/fallback/FAKE.json');
    });
    it('should return code.json version using getCodeJsonVersion', function() {
      const expectedVersion = '1.0.1';

      Utils.getCodeJsonVersion(codeJson).should.be.equal(expectedVersion);
    });
    it('should return code.json repos usign getCodeJsonRepos', function() {
      const expectedRepos = [
        {
          "name": "Save Mail",
          "organization": "FAKE_ORG",
          "description": "FAKE Gmail extension to save messages to local disk",
          "license": null,
          "openSourceProject": 1,
          "governmentWideReuseProject": 0,
          "tags": [
            "save",
            "mail"
          ],
          "contact": {
            "email": "fake@fake.gov",
            "name": "Derp Fakerson",
            "phone": "5555555555"
          },
          "repository": null,
          "status": "Production",
          "vcs": "git",
          "homepage": "https://github.com/FAKEGOV/FAKEMailSaveMessageExtension-",
          "downloadURL": "https://github.com/FAKE_ORG/FAKEMailSaveMessageExtension-/archive/master.zip",
          "exemption": null,
          "exemptionText": "No exemption requested",
          "updated": {
            "lastCommit": "2017-04-11",
            "metadataLastUpdated": "2017-04-22",
            "sourceCodeLastModified": "2017-04-11"
          }
        }
      ];
      Utils.getCodeJsonRepos(codeJson).should.be.deep.equal(expectedRepos)
    });
  });
  describe('isValidEmail', function() {
    it('should return if the passed email has a valid format', function() {
      Utils.isValidEmail('somebody@somewhere.com').should.be.true;
      Utils.isValidEmail('somebodysomewhere.com').should.be.false;
    });
  });
  describe('isValidUrl', function() {
    it('should return if the passed URL has a valid format', function() {
      Utils.isValidUrl('https://code.gov').should.be.true;
      Utils.isValidUrl('https://code_gov').should.be.false;
    });
  });


  describe('removeDupes', function() {
    it('should return collection1 without the duplicates found in collection2', function() {
      const collection1 = [
        {
          "name": "Somebody Somewhere",
          "age": 45,
          "city": "NYC"
        },
        {
          "name": "Somebody Here",
          "age": 32,
          "city": "New Orleans"
        }
      ]
      const collection2 = [
        {
          "name": "Somebody Somewhere",
          "age": 45,
          "city": "NYC"
        },
        {
          "name": "Juan del Pueblo",
          "age": 20,
          "city": "San Juan"
        }
      ]
      const expectedResult = [
        {
          "name": "Somebody Here",
          "age": 32,
          "city": "New Orleans"
        }
      ];

      Utils.removeDupes(collection1, collection2).should.be.deep.equal(expectedResult);
    });
  });
  describe('getFieldWeight', function() {
    it('should return weight value of field passed', function() {

      Utils.getFieldWeight('name').should.be.equal(1)
      Utils.getFieldWeight('repositoryURL').should.be.equal(0.8)
      Utils.getFieldWeight('disclaimerURL').should.be.equal(0.4)

    });
  });
  describe('getScore', function() {
    it('should return object with new score', function() {
      const target1 = {
        name: 'Froilan',
        score: 23
      };
      const target2 = {
        name: 'Froilan'
      }

      Utils.getScore(target1, 1).should.be.equal(24);
      Utils.getScore(target2, 2).should.be.equal(2);
    });
  });
})