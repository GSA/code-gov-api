// Tests for the Status Dashboard
const app     = require('../../app');
const request = require('supertest');
const chai = require('chai');
const should = chai.should();
const _ = require('lodash');
const nock = require('nock');
const {agencies_es_response, agencies_es_query, agency_es_query, status_response} = require('../nock/agencies');

describe('Dashboard', () => {
  let endpoint;
  before(() => {
    endpoint = '/api/';
    nock('http://localhost:9200')
      .persist()
      .head(mockJSONContentType)
      .reply(200, true)
      .post('/terms/term/_search')
      .reply(200, (uri, requestBody) => {
        return agencies_es_response;
      })
      .post('/status/status/_search')
      .reply(200, (uri, requestBody) => {
        return status_response;
      });
  });

  it('/api/ responds with a 200', (done) => {
    request(app)
      .get(endpoint)
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end(done);
  });

  it('/api/status.json responds with a 200', (done) => {
    request(app)
      .get('/api/status.json')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect(response => {
        response.body.statuses.should.be.a('object');
        Object.keys(response.body.statuses).length.should.be.at.least(1);
      })
      .end(done);
  });
});
