const fs = require("fs");
const path = require('path');
const { Transform } = require("stream");
const config = require("../../../config");
const request = require("request");
const Jsonfile = require("jsonfile");
const Logger = require('../../../utils/logger')

const logger = new Logger({name: 'agency-json-stream'});
const fetchedDir = path.join(__dirname, '../../../data/fetched/');

class AgencyJsonStream extends Transform {
  constructor() {
    super({
      objectMode: true
    });
  }

  _saveFetchedCodeJson(agencyAcronym, codeJson) {
    logger.debug('Entered saveFetchedCodeJson - Agency: ', agencyAcronym);

    return new Promise((fulfill, reject) => {
      Jsonfile.spaces = 2;
      const filename = `${agencyAcronym}.json`;
      const fetchedFilepath = path.join(fetchedDir, filename);
    
      try {
        const parsedJson = JSON.parse(codeJson);
        Jsonfile.writeFile(fetchedFilepath, parsedJson, (err) => {
          if (err) {
            reject(err);
          } else {
            fulfill(parsedJson);
          }
        });
      } catch(err) {
        reject(err);
      }  
    });
  }

  _getAgencyCodeJson(agency){
    logger.debug('Entered saveFetchedCodeJson - Agency: ', agency.acronym);

    return new Promise((fulfill, reject) => {
      const requestParams = {
        followAllRedirects: true,
        rejectUnauthorized: false,
        url: agency.codeUrl,
        headers: {
          'User-Agent': 'code.gov',
          'Content-Type': 'application/json'
        }
      };
  
      request(requestParams, (err, response, body) => {
        if(err) {
          reject(`${agency.codeUrl} - ${err}`);
        } else {
          if(response.statusCode === 200) {
            const formattedData = body.replace(/^\uFEFF/, '');
  
            this._saveFetchedCodeJson(agency.acronym, formattedData)
              .then(data => {
                fulfill(data);
              })
              .catch(err => {
                reject(`${agency.codeUrl} - ${err}`);
              });
          } else {
            reject(`${agency.codeUrl} returned ${response.statusCode}`);
          }
        }
      });
    });
  }

  _validateCodeJson(codeJson) {
    logger.debug('Entered _validateCodeJson - Agency: ', codeJson.agency);

    return new Promise((fulfill, reject) => {
      // get validator for code.json version
      fulfill(codeJson);
    });
  }

  _formatCodeJson(codeJson) {
    logger.debug('Entered _formatCodeJson - Agency: ', codeJson.agency);

    return new Promise((fulfill, reject) => {
      fulfill(codeJson);
    });
  }

  _transform(agency, enc, callback) {
    logger.debug('Entered _transform - Agency: ', agency.acronym);

    this._getAgencyCodeJson(agency)
      .then(codeJson => {
        return this._validateCodeJson(codeJson)
      })
      .then(validCodeJson => {
        return this._formatCodeJson(validCodeJson);
      })
      .then(formattedCodeJson => {
        this.push(formattedCodeJson);
      })
      .catch(err => {
        logger.error(err);
      });
    callback();
  }
}

module.exports = AgencyJsonStream;
