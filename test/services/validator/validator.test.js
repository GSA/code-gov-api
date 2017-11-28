const Validator = require('../../../services/validator');

describe('Validator service', function() {
  let validator;
  before(function() {
    validatorSchema100 = new Validator('1.0.0', '../../../schemas/repo/');
    validatorSchema101 = new Validator('1.0.1', '../../../schemas/repo/');
    validatorSchema200 = new Validator('2.0.0', '../../../schemas/repo/');
    
    
  })
  description('Validate successfully', function() {
    it('Schema version 1.0.0', function() {
      validatorSchema100.validateRepo(repo, agency, (err, results) => {
        const errorTotals = results.issues.errors.length + results.issues.warnings.length + results.issues.enhancements.length
        errorTotals.should.equal(0)
      });

    });

    it('Schema version 1.0.1', function() {
      validatorSchema101.validateRepo(repo, agency, (err, results) => {
        const errorTotals = results.issues.errors.length + results.issues.warnings.length + results.issues.enhancements.length
        errorTotals.should.equal(0)
      });
    })

    it('Schema version 2.0.0', function() {
      validatorSchema200.validateRepo(repo, agency, (err, results) => {
        const errorTotals = results.issues.errors.length + results.issues.warnings.length + results.issues.enhancements.length
        errorTotals.should.equal(0)
      });
    })
  })

  description('Validate returns errors', function() {
    it('Schema version 1.0.0', function() {
      validatorSchema100.validateRepo(repo, agency, (err, results) => {
        const errorTotals = results.issues.errors.length + results.issues.warnings.length + results.issues.enhancements.length
        errorTotals.should.not.equal(0)
      });
    });

    it('Schema version 1.0.1', function() {
      validatorSchema101.validateRepo(repo, agency, (err, results) => {
        const errorTotals = results.issues.errors.length + results.issues.warnings.length + results.issues.enhancements.length
        errorTotals.should.not.equal(0)
      });
    })

    it('Schema version 2.0.0', function() {
      validatorSchema200.validateRepo(repo, agency, (err, results) => {
        const errorTotals = results.issues.errors.length + results.issues.warnings.length + results.issues.enhancements.length
        errorTotals.should.not.equal(0)
      });
    })
  })
})
