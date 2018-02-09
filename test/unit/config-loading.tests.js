const getConfig = require('../../config');
const chai = require('chai');
const should = chai.should();

describe('Load config', function() {
  it('should load development config', function() {
    const config = getConfig('development');

    config.ES_HOST.should.be.equal('localhost');
  });
  it('should load production config', function() {
    const config = getConfig('production');

    config.USE_HSTS.should.be.equal(true);
  });
});

