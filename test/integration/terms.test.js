const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const should = chai.should();

describe('/terms endpoint', () => {

  it('responds with a 200', (done) => {
    request(app)
      .get('/api/0.1/terms')
      .expect(200)
      .end(done);
  });

  describe('simple search', () => {
    it('includes a "total" count of at least 13', (done) => {
      // See supertest documentation for this assertion style
      request(app).get('/api/0.1/terms?term_type=agency.acronym')
        .expect(response => {
          response.body.total.should.be.at.least(13)
        })
        .end(done);
    });
  });
});
