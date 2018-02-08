const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const should = chai.should();

describe('/repos endpoint', () => {

  it('responds with a 200', (done) => {
    request(app)
      .get('/api/0.1/repos')
      .expect(200)
      .expect(res => {
        res.body.should.be.a('object');
      })
      .end(done);
  });

  describe('the output JSON structure', () => {
    it('includes a "total" count of at least 2000', (done) => {
      // See supertest documentation for this assertion style
      request(app).get('/api/0.1/repos')
        .expect((res) => {
          res.body.total.should.be.at.least(2000)
        })
        .end(done);
    });
  });
});
