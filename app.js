const bodyParser = require('body-parser');
const getConfig = require("./config");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require("express");
const getApiRoutes = require('./routes');
const helmet = require('helmet');
const Indexer = require("./scripts/index/index.js");
const Logger = require("./utils/logger");
const path = require("path");
const RateLimit = require('express-rate-limit');
const Searcher = require("./services/searcher");
const ElasticsearchSearcherAdapter = require("./utils/search_adapters/elasticsearch_adapter");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

/* eslint-disable */
const request = require("request");
const pug = require("pug");
const favicon = require('serve-favicon');
/* eslint-enable */

/* ------------------------------------------------------------------ *
                            API CONFIG
 * ------------------------------------------------------------------ */

// define and configure express
const app = express();
const port = process.env.PORT || 3001;
const limiter = new RateLimit({
  windowMs: parseInt(process.env.WINDOW_MS || 60000, 10),
  max: parseInt(process.env.MAX_IP_REQUESTS || 500, 10),
  delayMs:parseInt(process.env.DELAY_MS || 0, 10),
  headers: true
});
const config = getConfig(process.env.NODE_ENV);

app.set('json escape', true);
app.use(limiter);
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(helmet());
app.use(helmet.hsts({
  maxAge: config.HSTS_MAX_AGE,
  preload: config.HSTS_PRELOAD,
  setIf: function() {
    return config.USE_HSTS;
  }
}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('json spaces', 2);

const logger = new Logger({name: "code-gov-api"});

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
const searcherAdapter = new ElasticsearchSearcherAdapter(config);
const searcher = new Searcher(searcherAdapter, config);
const router = getApiRoutes(config, searcher, new express.Router());
app.use('/api/0.1', router);

/* ------------------------------------------------------------------ *
                            ERROR HANDLING
 * ------------------------------------------------------------------ */

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler (prints stacktrace)
if (app.get('env') === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    logger.error(err);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler (prints generic error message)
app.use(function(err, req, res) {
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

// start the server, but only if we're not in the middle of a test
if(!module.parent) {
  if(config.prod_envs.includes(process.env.NODE_ENV)) {
    require('newrelic');
  }

  app.listen(port);
  // schedule the interval at which indexings should happen
  const indexInterval = config.INDEX_INTERVAL_SECONDS;
  const indexer = new Indexer(config);
  if (indexInterval) {
    indexer.schedule(indexInterval);
    logger.info(`Production: re-indexing every ${indexInterval} seconds`);
  }

  logger.info(`Started API server at http://0.0.0.0:${port}/`);
}

module.exports = app;
