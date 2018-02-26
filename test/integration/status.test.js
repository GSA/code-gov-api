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
      .expect(200, done);
  });
});
