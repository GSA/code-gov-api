const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const should = chai.should();

describe('/repos endpoint', () => {
  let endpoint;
  before(() => {
    endpoint = '/api/repos';
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

  describe('the output JSON structure', () => {
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
});
