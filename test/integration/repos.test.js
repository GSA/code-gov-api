const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const _ = require('lodash');
const should = chai.should();
const adapters = require('@code.gov/code-gov-adapter');
const nock = require('nock');
const { repos_es_response, repos_es_query } = require('../nock/repos');

describe('/repos endpoint', () => {
  let endpoint;
  let agency;
  let mockjsoncontenttype;

  before(() => {
    mockjsoncontenttype = { "content-type": "application/json" };
    endpoint = '/api/repos';
    agency = 'ssa';

    nock('http://localhost:9200')
      .persist()
      .head(mockjsoncontenttype)
      .reply(200, true)
      .post('/repos/repo/_search', _.matches(repos_es_query))
      .reply(200, (uri, requestbody) => {
        return repos_es_response;
      });
  });

  it('responds with a 200', (done) => {
    request(app)
      .get(endpoint)
      .expect(200)
      .expect(res => {
        res.body.should.be.a('object');
      })
      .end(done);
  });

  it('includes a "total" count of at least 2000', (done) => {
    request(app)
      .get(endpoint)
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect((res) => {
        res.body.total.should.be.at.least(1000)
      })
      .end(done);
  });

});
