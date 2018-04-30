const chai = require('chai');
const should = chai.should();
const expect = chai.expect();
const routes = require('../../routes/routes');
const {
  queryReposAndSendResponse,
  getRepoById,
  getTerms,
  getAgencies,
  getAgency,
  getLanguages,
  getRepoJson,
  getStatusData,
  getVersion,
  getAgencyIssues,
  getDiscoveredReposByAgency,
  getFetchedReposByAgency,
  getRootMessage } = require('../../routes/utils');
const path = require('path');

describe('Testing routes/utils.js', () => {
  let mockLogger;
  let mockSearcher;
  let config;

  before(() => {
    mockLogger = {
      info: (msg) => {
        console.log(msg);
      },
      error: (msg) => {
        console.error(msg);
      },
      debug: (msg) => {
        console.debug(msg);
      }
    };
    mockSearcher = {
      searchStatus: (callback) => {
        const report = require('./test_data/report.json');
        callback(null, [report]);
      },
      searchTerms: (query, callback) => {
        let agencies = [
          {
            "term_key": "doe",
            "term": "doe",
            "term_type": "agency.acronym",
            "count": 705,
            "count_normalized": 0.4662698412698413,
            "score": 0
          }, {
            "term_key": "hud",
            "term": "hud",
            "term_type": "agency.acronym",
            "count": 172,
            "count_normalized": 0.11375661375661375,
            "score": 0
          }, {
            "term_key": "hhs",
            "term": "hhs",
            "term_type": "agency.acronym",
            "count": 7,
            "count_normalized": 0.004629629629629629,
            "score": 0
          }, {
            "term_key": "dol",
            "term": "dol",
            "term_type": "agency.acronym",
            "count": 72,
            "count_normalized": 0.047619047619047616,
            "score": 0
          }, {
            "term_key": "ed",
            "term": "ed",
            "term_type": "agency.acronym",
            "count": 49,
            "count_normalized": 0.032407407407407406,
            "score": 0
          }, {
            "term_key": "doj",
            "term": "doj",
            "term_type": "agency.acronym",
            "count": 13,
            "count_normalized": 0.008597883597883597,
            "score": 0
          }, {
            "term_key": "usda",
            "term": "usda",
            "term_type": "agency.acronym",
            "count": 17,
            "count_normalized": 0.011243386243386243,
            "score": 0
          }, {
            "term_key": "dhs",
            "term": "dhs",
            "term_type": "agency.acronym",
            "count": 19,
            "count_normalized": 0.012566137566137565,
            "score": 0
          }, {
            "term_key": "nasa",
            "term": "nasa",
            "term_type": "agency.acronym",
            "count": 1005,
            "count_normalized": 0.6646825396825397,
            "score": 0
          }, {
            "term_key": "dot",
            "term": "dot",
            "term_type": "agency.acronym",
            "count": 125,
            "count_normalized": 0.08267195767195767,
            "score": 0
          }, {
            "term_key": "gsa",
            "term": "gsa",
            "term_type": "agency.acronym",
            "count": 1512,
            "count_normalized": 1,
            "score": 0
          }, {
            "term_key": "epa",
            "term": "epa",
            "term_type": "agency.acronym",
            "count": 105,
            "count_normalized": 0.06944444444444445,
            "score": 0
          }, {
            "term_key": "usaid",
            "term": "usaid",
            "term_type": "agency.acronym",
            "count": 2,
            "count_normalized": 0.0013227513227513227,
            "score": 0
          }, {
            "term_key": "va",
            "term": "va",
            "term_type": "agency.acronym",
            "count": 7,
            "count_normalized": 0.004629629629629629,
            "score": 0
          }, {
            "term_key": "ssa",
            "term": "ssa",
            "term_type": "agency.acronym",
            "count": 127,
            "count_normalized": 0.083994708994709,
            "score": 0
          }, {
            "term_key": "cfpb",
            "term": "cfpb",
            "term_type": "agency.acronym",
            "count": 235,
            "count_normalized": 0.15542328042328044,
            "score": 0
          }, {
            "term_key": "nara",
            "term": "nara",
            "term_type": "agency.acronym",
            "count": 19,
            "count_normalized": 0.012566137566137565,
            "score": 0
          }, {
            "term_key": "nsf",
            "term": "nsf",
            "term_type": "agency.acronym",
            "count": 27,
            "count_normalized": 0.017857142857142856,
            "score": 0
          }, {
            "term_key": "treasury",
            "term": "treasury",
            "term_type": "agency.acronym",
            "count": 5,
            "count_normalized": 0.0033068783068783067,
            "score": 0
          }, {
            "term_key": "sba",
            "term": "sba",
            "term_type": "agency.acronym",
            "count": 5,
            "count_normalized": 0.0033068783068783067,
            "score": 0
          }
        ];

        agencies = agencies.filter(agency => {
          return query.term ? agency.term === query.term.toLowerCase() : true;
        });

        const terms = {
          total: agencies.length,
          terms: agencies
        };
        callback(null, terms);
      },
      searchRepos: (query, callback) => {
        return {};
      }
    };
    config = {
      AGENCY_ENDPOINTS_FILE: path.join(path.dirname(path.dirname(__dirname)), '/config/agency_metadata.json')
    }
  });

  describe('Fetching status report', () => {
    let statusReportFile;
    let agency;

    before(() => {
      fetchDataDir = path.join(__dirname, '/test_data/fetched')
      agency = 'GSA';
    });

    it('should return status object', () => {
      return getStatusData(mockSearcher)
        .then(statusData => {
          statusData.should.be.a('object');
          // statusData.statuses.should.be.a('object');
          // statusData.statuses[agency].version.should.be.equal('2.0.0');
        });
    });

    describe('Agency status issues', () => {
      it('should return the status issues for a specified agency', () => {
        return getAgencyIssues(agency, mockSearcher)
          .then(issuesData => {
            issuesData.statusData.issues.length.should.be.equal(1514);
          });
      });
    });
  });

  describe('Get Agency Data', () => {
    let mockRequest;
    before(() => {
      mockRequest = {
        query: {
          size: 20
        },
        params: {
          agency_acronym: 'GSA'
        }
      };
    });

    it('should return data for all indexed agencies', () => {
      return getAgencies(mockRequest, mockSearcher, config, mockLogger)
        .then(result => {
          result.agencies.should.be.a('array');
          result.agencies.length.should.be.at.least(20);
        })
    });

    it('should return agency data for the requested agency', () => {
      return getAgency(mockRequest, mockSearcher, config, mockLogger)
        .then(result => {
          result.agency.should.be.a('object');
          result.agency.name.should.be.equal('General Services Administration');
        });
    });
  });

  describe('version', () => {
    it('should return API version information from the package.json and git data ', () => {
      getVersion()
        .then(versionInfo => {
          versionInfo['version'].should.not.be.empty;
          versionInfo['git-hash'].should.not.be.empty;
          versionInfo['git-repository'].should.match(/https:\/\/github.com\/GSA\/code-gov-api/);
        });
    });
  });
});

