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
app.use(bodyParser.urlencoded({ extended: false }));
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

/* get repos that match supplied search criteria */
router.get('/repos', (req, res, next) => {
  let q = req.query;
  queryReposAndSendResponse(q, res, next);
});

router.post('/repos', (req, res, next) => {
  let q = req.body;
  queryReposAndSendResponse(q, res, next);
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
  const reportFilepath = path.join(
    __dirname, config.REPORT_FILEPATH
  );
  fs.readFile(reportFilepath, (err, data) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let statusData = _.omit(JSON.parse(data),
      config.AGENCIES_TO_OMIT_FROM_STATUS);
    res.json(statusData);
  });
});

router.get(`/status`, (req, res, next) => {
  fs.readFile(config.REPORT_FILEPATH, (err, data) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let title = "Code.gov API Status";
    let statusData = _.omit(JSON.parse(data),
      config.AGENCIES_TO_OMIT_FROM_STATUS);
    res.render('status', { title, statusData });
  });
});

router.get(`/status/:agency`, (req, res, next) => {
  let agency = req.params.agency.toUpperCase();
  fs.readFile(config.REPORT_FILEPATH, (err, data) => {
    if (err) {
      logger.error(err);
      return res.sendStatus(500);
    }
    let title = "Code.gov API Status for " + agency;
    let statusData = JSON.parse(data)[agency];
    if (statusData) {
      return res.render('agency/status', { title, statusData });
    } else {
      return res.sendStatus(404);
    }
  });
});

router.get(`/status/:agency/fetched`, (req, res, next) => {
  let agency = req.params.agency.toUpperCase();
  Jsonfile.readFile(`${config.FETCHED_DIR}/${agency}.json`, (err, data) => {
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
  Jsonfile.readFile(`${config.DISCOVERED_DIR}/${agency}.json`, (err, data) => {
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
//     return res.render('agency/diff', { title, diffChunks });
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
