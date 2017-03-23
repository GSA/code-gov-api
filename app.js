/*
  TODOS/RECS:
    * tests
    * lint/githook rules
*/

const _                   = require("lodash");
const fs                  = require("fs");
const async               = require("async");
const express             = require("express");
const request             = require("request");
const path                = require("path");
const md                  = require("marked");
const git                 = require("git-rev");
const favicon             = require('serve-favicon');
const cookieParser        = require('cookie-parser');
const bodyParser          = require('body-parser');
const cors                = require('cors');
const pug                 = require("pug");
const Jsonfile            = require("jsonfile");
const diff                = require("diff");
const config              = require("./config");
const searcherAdapter     = require("./utils/search_adapters/elasticsearch_adapter");
const Searcher            = require("./services/searcher");
const Utils               = require("./utils");
const Logger              = require("./utils/logger");
const repoMapping         = require("./indexes/repo/mapping.json");
const pkg                 = require("./package.json");

/* ------------------------------------------------------------------ *
                            API CONFIG
 * ------------------------------------------------------------------ */

// define and configure express
let app = express();
let port = process.env.PORT || 3001;
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('json spaces', 2);

// logging setup
let logger = new Logger({name: "code-gov-api"});
// app.use(bunyanMiddleware({
//   headerName: 'X-Request-Id',
//   propertyName: 'reqId',
//   logName: 'req_id',
//   obscureHeaders: [],
//   logger: logger
// }));


/* ------------------------------------------------------------------ *
                            API ROUTES
 * ------------------------------------------------------------------ */

let router = express.Router();

let searcher = new Searcher(searcherAdapter);

const _getRelativeFilepath = (filepath) => {
  return path.join(__dirname, filepath);
}

const searchPropsByType =
  Utils.getFlattenedMappingPropertiesByType(repoMapping["repo"]);

const respondInvalidQuery = (res) => {
  return res.status(400).send("Invalid query.");
}

/* get a repo by nci or nct id */
router.get('/repo/:id', (req, res, next) => {
  let id = req.params.id;
  searcher.getRepoById(id, (err, repo) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    if (!_.isEmpty(repo)) {
      res.json(repo);
    } else {
      res.sendStatus(404);
    }
  });
});

const _getInvalidRepoQueryParams = (queryParams) => {
  let without = _.without(queryParams,
    "from", "size", "sort", "_fulltext", "include", "exclude");
  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (
        _.includes(searchPropsByType["date"], paramWithoutOp) ||
        _.includes(searchPropsByType["byte"], paramWithoutOp)
      ) {
        return false;
      }
    } else if (
      queryParam.endsWith("_lon") ||
      queryParam.endsWith("_lat") ||
      queryParam.endsWith("_dist")
    ) {
      // special endings for geo distance filtering.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["geo_point"], paramWithoutOp) ) {
        return false;
      }
    }
    return true;
  });
}

const queryReposAndSendResponse = (q, res, next) => {
  let queryParams = Object.keys(q);
  // validate query params...
  let invalidParams = _getInvalidRepoQueryParams(queryParams);
  if (invalidParams.length > 0) {
    let error = {
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    };
    logger.error(error);
    return res.status(400).send(error);
  }

  searcher.searchRepos(q, (err, repos) => {
    // TODO: add better error handling
    if(err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    // TODO: format repos

  

    res.json(repos);
  });
}

const _readStatusReportFile = (next) => {
  const reportFilepath = _getRelativeFilepath(config.REPORT_FILEPATH);
  fs.readFile(reportFilepath, (err, data) => {
    if (err) {
      return next(err);
    }
    let statusData = JSON.parse(data);
    statusData.statuses = _.omit(
      statusData.statuses,
      config.AGENCIES_TO_OMIT_FROM_STATUS
    );
    return next(null, statusData);
  });
}

const _readAgencyEndpointsFile = (next) => {
  const agencyEndpointsFilepath = _getRelativeFilepath(config.AGENCY_ENDPOINTS_FILE);
  fs.readFile(agencyEndpointsFilepath, (err, data) => {
    if (err) {
      return next(err);
    }
    let agencyEndpoints = JSON.parse(data);
    return next(null, agencyEndpoints);
  });
}

/* get repos that match supplied search criteria */
router.get('/repos', (req, res, next) => {
  let q = req.query;
  queryReposAndSendResponse(q, res, next);
});



router.post('/repos', (req, res, next) => {
  let q = req.body;
  queryReposAndSendResponse(q, res, next);
});

/* get key terms that can be used to search through repos */
router.get('/terms', (req, res, next) => {
  let q = _.pick(req.query, ["term", "term_type", "size", "from"]);

  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

router.post('/terms', (req, res, next) => {
  let q = _.pick(req.body, ["term", "term_type", "size", "from"]);

  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

router.get(`/agencies`, (req, res, next) => {
  // NOTE: this relies on the terms endpoint and the `agency.acronym` term type

  async.parallel({
    agencyDataHash: (next) => {
      _readAgencyEndpointsFile((err, agencyEndpoints) => {
        if (err) { return next(err); }
        let agencyDataHash = {};
        agencyEndpoints.forEach((agencyEndpoint) => {
          agencyDataHash[agencyEndpoint.acronym] = agencyEndpoint;
        });
        return next(null, agencyDataHash);
      });
    },
    terms: (next) => {
      let q = _.pick(req.query, ["size", "from"]);
      if (req.query.acronym) {
        q.term = req.query.acronym;
      }
      q.term_type = "agency.acronym";
      q.size = q.size ? q.size : 100;

      searcher.searchTerms(q, (err, terms) => {
        if (err) { return next(err); }
        return next(null, terms.terms);
      });
    }
  }, (err, {agencyDataHash, terms}) => {
    if(err) {
      logger.error(err);
      return res.sendStatus(500);
    }

    let agencies = [];
    terms.forEach((term) => {
      let acronym = term.term.toUpperCase();
      let agencyData = agencyDataHash[acronym];
      agencies.push({
        acronym: acronym,
        name: agencyData.name,
        website: agencyData.website,
        codeUrl: agencyData.codeUrl,
        numRepos: term.count
      });
    });

    res.json({
      total: agencies.length,
      agencies: agencies
    });
  });
});

router.get(`/languages`, (req, res, next) => {
  // NOTE: this relies on the terms endpoint and the `languages` term type

  let q = _.pick(req.query, ["size", "from"]);
  if (req.query.language) {
    q.term = req.query.language;
  }
  q.term_type = "languages";
  q.size = q.size ? q.size : 100;

  searcher.searchTerms(q, (err, terms) => {
    if (err) { return next(err); }

    let languages = [];
    terms.terms.forEach((term) => {
      languages.push({
        name: term.term,
        numRepos: term.count
      });
    });

    res.json({
      total: languages.length,
      languages: languages
    });
  });
});

router.get('/repo.json', (req, res, next) => {
  let repoJson = Utils.omitPrivateKeys(repoMapping);
  let excludeKeys = [
    "analyzer", "index",
    "format", "include_in_root",
    "include_in_all"
  ]
  repoJson = Utils.omitDeepKeys(repoJson, excludeKeys);
  res.json(repoJson["repo"]["properties"]);
});

router.get('/status.json', (req, res, next) => {
  _readStatusReportFile((err, statusData) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    res.json(statusData);
  });
});

router.get(`/status`, (req, res, next) => {
  _readStatusReportFile((err, statusData) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let title = "Code.gov API Status";
    res.render('status', { title, statusData });
  });
});

router.get(`/status/:agency/issues`, (req, res, next) => {
  let agency = req.params.agency.toUpperCase();


  const reportFilepath = _getRelativeFilepath(config.REPORT_FILEPATH);
  fs.readFile(reportFilepath, (err, data) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let title = "Code.gov API Status for " + agency;    
    let statusData = JSON.parse(data).statuses[agency];
    if (statusData) {
      return res.render('status/agency/issues', { title, statusData});
    } else {
      return res.sendStatus(404);
    }

  });

});

router.get(`/status/:agency/fetched`, (req, res, next) => {
  let agency = req.params.agency.toUpperCase();
  const fetchedFilepath = _getRelativeFilepath(
    `${config.FETCHED_DIR}/${agency}.json`
  );
  Jsonfile.readFile(fetchedFilepath, (err, data) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let title = "Code.gov API Status for " + agency;
    return res.json(data);
  });
});

router.get(`/status/:agency/discovered`, (req, res, next) => {
  let agency = req.params.agency.toUpperCase();
  const discoveredFilepath = _getRelativeFilepath(
    `${config.DISCOVERED_DIR}/${agency}.json`
  );
  Jsonfile.readFile(discoveredFilepath, (err, data) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let title = "Code.gov API Status for " + agency;
    return res.json(data);
  });
});

// router.get(`/status/:agency/diff`, (req, res, next) => {
//   let agency = req.params.agency.toUpperCase();
//   Jsonfile.readFile(path.join(
//     __dirname,
//     config.DIFFED_DIR,
//     `${agency}.json`
//   ), (err, diffChunks) => {
//     if (err) {
//       logger.error(err);
//       return res.sendStatus(500);
//     }
//     let title = "Code.gov API Diff for " + agency;
//     return res.render('status/agency/diff', { title, diffChunks });
//   });
// });

router.get('/version', (req, res, next) => {
  const _sendVersionResponse = (gitHash) => {
    res.json({
      "version": pkg.version,
      "git-hash": gitHash,
      "git-repository": pkg.repository.url
    });
  };

  git.long((gitHash) => {
    _sendVersionResponse(gitHash);
  });
});

router.get('/', (req, res, next) => {
  let title = "Code.gov API";
  res.render('index', { filters: [ md ], title: title });
});

// all of our routes will be prefixed with /api/<version>/
app.use('/api/0.1', router);


/* ------------------------------------------------------------------ *
                            ERROR HANDLING
 * ------------------------------------------------------------------ */

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler (prints stacktrace)
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    logger.error(err);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler (prints generic error message)
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
  logger.error(err);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


/* ------------------------------------------------------------------ *
                            SERVER
 * ------------------------------------------------------------------ */

// start the server
app.listen(port);
logger.info(`Started API server at http://localhost:${port}/`);
