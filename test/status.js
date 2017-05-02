// Tests for the Status Dashboard

const request = require('supertest');
const app     = require('../app');

describe('Dashboard', () => {
  it('responds with a 200', (done) => {
    request(app)
      .get('/api/0.1/status')
      .expect('Content-Type', /html/)
      .expect(200, done);
  });
});
