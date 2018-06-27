// Tests for the Status Dashboard

const app     = require('../../app');
const request = require('supertest');

describe('Dashboard', () => {
  let endpoint;
  before(() => {
    endpoint = '/api/status';
  });
  it('responds with a 200', (done) => {
    request(app)
      .get(endpoint)
      .expect('Content-Type', /html/)
      .expect(200)
      .end(done);
  });
});

describe('Status.json', () => {
  let endpoint;
  before(() => {
    endpoint = '/api/status.json';
  });
  it('responds with a 200', (done) => {
    request(app)
      .get(endpoint)
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect(response => {
        response.body.statuses.should.be.a('object')
        Object.keys(response.body.statuses).length.should.be.at.least(20);
      })
      .end(done);
  });
});
