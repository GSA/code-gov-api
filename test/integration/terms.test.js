const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const _ = require('lodash');
const should = chai.should();
const nock = require('nock');
const { terms_es_response } = require('../nock/terms');

describe('/terms endpoint', () => {
  let endpoint;

  before(() => {
    mockjsoncontenttype = { "content-type": "application/json" };
    endpoint = '/api/terms';

    nock('http://localhost:9200')
      .persist()
      .get('/api/terms?term_type=agency.acronym')
      .reply(200, true)
      .post('/terms/term/_search')
      .reply(200, (uri, requestbody) => {
        return terms_es_response;
      })
  });

  it('responds with a 200', (done) => {
    request(app)
      .get(endpoint)
      .expect(200)
      .end(done);
  });

  describe('simple search', () => {
    it('includes a "total" count of at least 13', (done) => {
      request(app)
        .get(`${endpoint}?term_type=agency.acronym`)
        .expect(200)
        .expect(response => {
          response.body.total.should.be.at.least(1)
        })
        .end(done);
    });
  });
});
