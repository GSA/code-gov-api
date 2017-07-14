// Tests for the Status Dashboard

const app     = require('../../app');
const request = require('supertest');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;

describe('Dashboard', () => {
  it('responds with a 200', (done) => {
    request(app)
      .get('/api/0.1/status')
      .expect('Content-Type', /html/)
      .expect(200, done);
  });
});
