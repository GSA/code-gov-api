/*
  TODOS/RECS:
    * tests
    * lint/githook rules
*/

var express           = require("express");
var request           = require("request");
var path              = require("path");
var favicon           = require('serve-favicon');
var cookieParser      = require('cookie-parser');
var bodyParser        = require('body-parser');
var cors              = require('cors');
var pug               = require("pug");
var Logger            = require("./utils/logger");

/* ------------------------------------------------------------------ *
                            API CONFIG
 * ------------------------------------------------------------------ */

// define and configure express
var app = express();
var port = process.env.PORT || 3001;
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
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler (prints generic error message)
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


/* ------------------------------------------------------------------ *
                            API ROUTES
 * ------------------------------------------------------------------ */

var router = express.Router(); // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:[portnum]/api)
router.get('/', function(req, res) {
  //res.json({ message: 'This is the Code.gov API' });
  res.send("<html><h1>Welcome to the Code.gov API</h1><br><br> <h2>ENDPOINTS</h2>: <ul> <li> /api/repos  --list all federal agency repos</li> <li> /api/repos/agency  --list repos for specific agency</li></ul><br><hr> <h2>AGENCY ACRONYMS:</h2><ul> <li>Department of Agriculture: 	<em>USDA</em></li><li>Department of Commerce:	<em>DOC</em></li><li>Department of Defense:	<em>DOD</em></li><li>Department of Education:	<em>ED</em></li><li>Department of Energy:	<em>DOE</em></li><li>Department of Health and Human Services:	<em>HHS</em></li><li>Department of Housing and Urban Development:	<em>HUD</em></li><li>Department of Interior:<em>	DOI</em></li><li>Department of Justice:<em>	DOJ</em></li><li>Department of Labor:<em>	DOL</em></li><li>Department of State:<em>	DOS</em></li><li>Department of Transportation:<em>	DOT</em></li><li>Department of Treasury:<em>	TRE</em></li><li>Department of Veterans Affairs:	<em>VA</em></li><li>Environmental Protection Agency	:<em>EPA</em></li><li>National Aeronautics and Space Administration:	<em>NASA</em></li><li>Agency for International Development:	<em>AID</em></li><li>Federal Emergency Management Agency:	<em>FEMA</em></li><li>General Services Administration: 	<em>GSA</em></li><li>National Science Foundation	: NSF</em></li><li>Nuclear Regulatory Commission:	<em>NRC</em></li><li>Office of Personnel Management:	<em>OPM</em></li><li>Small Business Administration:	<em>SBA</em></li> </ul> </html>");


});

// TODO: more routes for our API will happen here
// on routes that end in /states/:state_id

// get all the repos (accessed at GET http://localhost:8080/api/repo)
router.route('/repos').get(function(req, res) {
  MongoClient.connect(mongoDetails, function(err, db) {
    if (err) {
      res.send("Sorry, there was a problem with the database: " + err);

      return console.error(err);
    } else {
      repos = db.collection("repos");
      console.log(" We're connected to the DB");

      repos.find().toArray(function(err, repodocs) {
        if (err) {
          res.send(err);
        } else {
          res.json(repodocs);
        }
      });
    }
  });
});

// get the repo with that id (accessed at GET http://localhost:8080/api/repos/:agency)
router.route('/repos/:agency').get(function(req, res) {
  MongoClient.connect(mongoDetails, function(err, db) {
    if (err) {
      res.send("Sorry, there was a problem with the database: " + err);
      return console.error(err);

    } else {
      repos = db.collection("repos");
      console.log(" We're connected to the DB");

      repos.find({
        agency: req.params.agency
      }).toArray(function(err, repodoc) {
        if (err) {
          res.send(err);
        } else {
          res.json(repodoc);
        }
      });
    }
  });
})

// all of our routes will be prefixed with /api/<version>/
app.use('/api/1.0', router);


/* ------------------------------------------------------------------ *
                            SERVER
 * ------------------------------------------------------------------ */

// start the server
app.listen(port);
console.log('Listening on port ' + port);
