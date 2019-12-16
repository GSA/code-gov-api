const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const _ = require('lodash');
const should = chai.should();
const nock = require('nock');
const {agencies_es_response, agencies_es_query, agency_es_query} = require('../nock/agencies');

describe('/agencies endpoint', () => {
  let adapter;
  let agency;
  let endpoint;

  before(() => {
    mockJSONContentType = { "Content-Type": "application/json" };
    endpoint = '/api/agencies';
    agency = 'SSA';

    nock('http://localhost:9200')
      .persist()
      .head(mockJSONContentType)
      .reply(200, true)
      .post('/terms/term/_search', _.matches(agencies_es_query))
      .reply(200, (uri, requestBody) => {
        return agencies_es_response;
      });

  });

  describe('the output JSON structure', () => {
    // ES connection mocked
    it('responds with a 200', (done) => {
      request(app)
        .get('/api/agencies')
        .expect(200)
        .end(done);
    });

    it('agencies response should be array', (done) => {
      request(app)
        .get('/api/agencies')
        .expect((res) => {
          res.body.agencies.should.be.a('array');
        })
        .end(done);
    });

    it('includes an array with agencies data', (done) => {
      request(app).get(endpoint)
        .expect((res) => {
          res.body.agencies.length.should.be.at.least(1);
        })
        .end(done);
    });
  });
});

describe('/agencies/:agency endpoint', () => {
  before(() => {
    mockJSONContentType = { "Content-Type": "application/json" };
    endpoint = '/api/agencies';
    agency = 'SSA';

    nock('http://localhost:9200')
      .persist()
      .head(mockJSONContentType)
      .reply(200, true)
      .post('/terms/term/_search', _.matches(agency_es_query))
      .reply(200, (uri, requestBody) => {
        return agencies_es_response;
      });

  });

  it('responds with a 200', (done) => {
    request(app)
      .get('/api/agencies/SSA')
      .expect(200)
      .expect(res => {
        res.body.should.be.a('object');
      })
      .end(done);
  });

  it('includes an object with agency data', (done) => {
    request(app)
      .get('/api/agencies/SSA')
      .expect(200)
      .expect((res) => {
        res.body.should.be.a('object');
        res.body.acronym.should.be.equal(agency);
      })
      .end(done);
  });
});

