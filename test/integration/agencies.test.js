const request = require('supertest');
const app = require('../../app');
const chai = require('chai');
const should = chai.should();

describe('/agencies endpoint', () => {
  let endpoint;
  let agency;
  before(() => {
    endpoint = '/api/agencies';
    agency = 'GSA';
  });

  it('responds with a 200', (done) => {
    request(app)
      .get(endpoint)
      .expect(200)
      .expect(res => {
        res.body.agencies.should.be.a('array');
      })
      .end(done);
  });

  describe('the output JSON structure', () => {
    it('includes an array with agencies data', (done) => {
      request(app).get(endpoint)
        .expect((res) => {
          res.body.agencies.length.should.be.at.least(1);
        })
        .end(done);
    });
  });

  describe('/agencies/:agency endpoint', () =>{
    it('responds with a 200', (done) => {
      request(app)
        .get(`${endpoint}/${agency}`)
        .expect(200)
        .expect(res => {
          res.body.should.be.a('object');
        })
        .end(done);
    });

    describe('the output JSON structure', () => {
      it('includes an object with agency data', (done) => {
        request(app)
          .get(`${endpoint}/${agency}`)
          .expect(200)
          .expect((res) => {
            res.body.should.be.a('object');
            res.body.acronym.should.be.equal(agency);
          })
          .end(done);
      });
    });
  });
})
