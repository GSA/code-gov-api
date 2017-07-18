// Tests for the /repos endpoint

const mockAdapter = require('../../utils/search_adapters/testable_elasticsearch_adapter');
const request = require('supertest');
const proxyquire = require('proxyquire');

describe('/repos endpoint', () => {
  let app;

  before(() => {
    // Load the app, but replace the ES adapter
    app = proxyquire('../../app', {
      './utils/search_adapters/elasticsearch_adapter': mockAdapter
    });

  });

  it('responds with a 200', (done) => {
    // Set the response returned by our fake ElasticSearch DB.
    // (esResponses defined below)
    mockAdapter.setResponse(esResponses.basic);

    request(app)
      .get('/api/0.1/repos')
      .expect(200)
      .expect(() => {
        // Purely to show how to use the MockAdapter:
        // Let's see the query that was sent to ES during this request.
        // console.log('Logged search query:', mockAdapter.getSearchArgs());
        // Request/response is async, so any code that works with the
        // response, or depends on the query having been run, needs to
        // live in a Promise-handling method
      })
      .end(done);
  });

  describe('the output JSON structure', () => {

    before(() => {
      mockAdapter.setResponse(esResponses.basic);
    });

    it('includes a "total" count of 3', (done) => {
      // See supertest documentation for this assertion style
      request(app).get('/api/0.1/repos')
        .expect((res) => {
          if(!('total' in res.body)) {
            throw new Error('No "total" attribute in body');
          }
          if(res.body.total !== 3) {
            throw new Error('total !== 3');
          }
        })
        .end(done);
    });
  });
});

const esResponses = {
  basic: {
    hits: {
      total: 3,
      hits: [
        {
          repos: []
        }
      ]
    }
  }
};
