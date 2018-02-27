const chai = require('chai');
const should = chai.should();
const routes = require('../../routes/routes');
const { readStatusReportFile, getAgencyData, queryReposAndSendResponse, getFileDataByAgency } = require('../../routes/utils');
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
      }
    };
    mockSearcher = {
      searchTerms: (query, callback) => {
        const agencies = [{
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
        }];
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
      AGENCY_ENDPOINTS_FILE: path.join(path.dirname(path.dirname(__dirname)), '/config/dev/agency_endpoints.json')
    }
  });

  describe('Reading status report file', () => {
    let statusReportFile;
    let agency;
    before(() => {
      statusReportFile = path.join(__dirname, '/test_data/report.json')
      agency = 'GSA';
    });
    it('should return status object after reading file', () => {
      return readStatusReportFile({
        REPORT_FILEPATH: statusReportFile
      }).then(statusData => {
        statusData.should.be.a('object');
        statusData.statuses[agency].version.should.be.equal('2.0.0');
      })
    });
  });

  describe('getAgencyData', () => {
    let mockRequest;
    before(() => {
      mockRequest = {
        query: {
          size: 10,
          acronym: ''
        },
        params: {
          agency_acronym: ''
        }
      };
    });

    it('should return agency data for agencies found in the agency metadata file that are in our data store', () => {
      return getAgencyData(mockRequest, mockSearcher, config, mockLogger)
        .then(agencies => {
          agencies.should.be.a('array');
          agencies.length.should.be.at.least(20);
        });
    });
  });
})

