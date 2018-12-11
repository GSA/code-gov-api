const getConfig = require('../../config');
const should = require('chai').should();
const path = require('path');

describe('Load config', function() {

  it('should load development config', function() {
    const config = getConfig('development');
    supportedSchemaVersions = [
      '1.0.0',
      '1.0.1',
      '2.0.0'
    ];

    config.ES_HOST.should.be.equal('http://localhost:9200');
    config.USE_HSTS.should.be.equal(false);
    config.HSTS_MAX_AGE.should.be.equal(31536000);
    config.HSTS_PRELOAD.should.be.equal(false);
    config.LOGGER_LEVEL.should.be.equal('info');
    should.exist(config.SWAGGER_DOCUMENT);

  });
  it('should load production config', function() {
    process.env.LOGGER_LEVEL='TRACE';
    process.env.USE_HSTS=true;
    process.env.HSTS_MAX_AGE=31536333;
    process.env.HSTS_PRELOAD=false;
    process.env.PORT=8888;
    process.env.ES_URI='https://somewhere.com/es';
    const config = getConfig('production');

    config.ES_HOST.should.be.equal('https://somewhere.com/es');
    config.PORT.should.be.equal('8888');
    config.USE_HSTS.should.be.equal(true);
    config.HSTS_MAX_AGE.should.be.equal(31536333);
    config.HSTS_PRELOAD.should.be.equal(false);
    config.LOGGER_LEVEL.should.be.equal('TRACE');
    should.exist(config.SWAGGER_DOCUMENT);
  });
});

