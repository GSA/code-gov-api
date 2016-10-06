/*
  TODOS/RECS:
    * should probably use mongoose
    * clean up string concatenation (can build json, then toString())
    * pull out tools into separate project
    * tests
    * lint/githook rules
    * use a logger
    * remove hardcoded vars and use env variables (or config) instead
*/

var express           = require("express");
var request           = require("request");
var path              = require("path");
var MongoClient       = require("mongodb").MongoClient;
var bodyParser        = require("body-parser");
var pug               = require("pug");
var dotenv            = require("dotenv");

var stopwords         = require("./utils/stopwords");
var agencyEndpoints   = require("./agency_endpoints.json");
var repo              = require("./models/repo.js");

// load the mongo `repo` model and synchronize it
var stream = repo.synchronize();

// load environment vars
// dotenv.load();
// NOTE: loads the mongo uri from the env variable MONGOURI
//       make sure your env has the right uri in the form of
//       mongodb://username:password@host:port/testdatabase
var mongoDetails = process.env.MONGOURI;

// define and configure express
var app = express();
var port = process.env.PORT || 3001;
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('json spaces', 2);


/* ------------------------------------------------------------------ *
                            TOOL ROUTES
 * ------------------------------------------------------------------ */

app.get('/', function(req, res) {
  MongoClient.connect(mongoDetails, function(err, db) {
    if (err) {
      res.send("Sorry, there was a problem with the database: " + err);

      return console.error(err);

    } else {
      repos = db.collection("repos");
      console.log(" We're connected to the DB");

      repos.find({
        agency: {
          $exists: true
        }
      }).toArray(function(err, repodocs) {
        if (err) {
          return console.error(err);
        } else {

          res.render('index.pug', {
            repos: repodocs
          });
        }
      });
    }
  });
});

app.get('/harvest', function(req, res) {
  var body;
  var message = '';

  MongoClient.connect(mongoDetails, function(err, db) {
    if (err) {
      res.send("Sorry, there was a problem with the database: " + err);

      return console.error(err);

    } else {
      repos = db.collection("repos");
      console.log("We're connected to the DB");
      message += "We've connected to the database<br>";


      // grab code.json files from various agencies.
      // SWITCH FROM DEVURL to PRODURL for production
      // TODO: should do this based upon env (not hardcoded)
      // =============================================================================
      console.log("length of agencyEndpoints: " + agencyEndpoints.length);
      var key, value;

      for (key = 1; key < agencyEndpoints.length; key++) {
        value = agencyEndpoints[key];
        console.log("Dev URL for " + value.ACRONYM + " is " + value.DEVURL);
        message += "Loading JSON data from " + value.ACRONYM + " located at " + value.DEVURL + "<br>";

        request(value.DEVURL, function(error, response, body) {
          if (error) {
            console.log(error)
          } else {
            console.log(value.DEVURL + '\n');
            repos.update({
              agency: {
                $eq: value.ACRONYM
              }
            }, JSON.parse(body), {
              upsert: true
            });
            console.log(value.ACRONYM + '\n');
            //repos.update({$and: [{agency: {$eq:value.ACRONYM}}, {agencyAcronym:{$exists:false}}]}, JSON.parse(body), {upsert:true});
            //repos.insert(body);
          }
        });
      }

      repos.remove({
        "agencyAcronym": {
          $exists: true
        }
      });

      repos.remove({
        agencyAcronym: {
          $exists: true
        }
      });

      message += "<br> JSON harvesting complete";
      res.send(message);
    }
  });
});

app.get('/convert', function(req, res) {
  res.render('convert.pug')
});

app.post('/', function(req, res) {
  var searchterm, searchquery;

  MongoClient.connect(mongoDetails, function(err, db) {
    if (err) {
      res.send("Sorry, there was a problem with the database: " + err);

      return console.error(err);

    } else {
      repos = db.collection("repos");
      searchterm = req.body.search;
      console.log(" We're connected to the DB");

      if ((searchterm.trim()).length > 1) {
        console.log("search term is: " + searchterm);
        searchquery = '{$elemMatch:{tag:searchterm}}';
        //repos.find({projects:{$elemMatch:{"pjctTags.tag":searchterm}}}, {'projects.$':1}).toArray(function(err, repodocs) {
        repos.find({
          projects: {
            $elemMatch: {
              "projectTags.tag": searchterm
            }
          }
        }, {
          'projects.$': 1,
          agency: 1
        }).toArray(function(err, repodocs) {
          if (err) {
            return console.error(err);
          } else {
            res.render('index.pug', {
              repos: repodocs
            });
          }
        });
      } else {
        searchquery = '{$exists:true}';
        console.log('empty');
        repos.find({
          "projects.projectTags": {
            $exists: true
          }
        }).toArray(function(err, repodocs) {
          if (err) {
            return console.error(err);
          } else {

            res.render('index.pug', {
              repos: repodocs
            });
          }
        });
      }
    }
  });
});

app.post('/convert', function(req, res) {
  var jsoninventory, record, codegovinventory_start,
      codegovinventory_projects, codegovinventory;

  var options = {
    url: req.body.jsonurl,
    headers: {
      'User-Agent': 'request',
      'Accept': 'application/vnd.github.full+json'
    }
  };

  request(options, function(error, response, body) {
    jsoninventory = JSON.parse(body);
    codegovinventory_projects = '';
    codegovinventory_start = '{ "agency": "TEST","status":"Alpha","projects":[';

    for (var i = 0; i < jsoninventory.length; i++) {

      codegovinventory_projects +=
        '{"vcs":"git", "repository": "' + jsoninventory[i].git_url +
        '", "name": "' + jsoninventory[i].name + '", "repoID":"' +
        jsoninventory[i].id + '","homepage":"' + jsoninventory[i].homepage +
        '","downloadURL":" ","description":"' + jsoninventory[i].description +
        ' ",' + '"contact":[{"email":" ","name":" ","twitter":" ","phone":" "}],' +
        '"partners":[{"name":" "},{"email":" "}],' +
        '"license":"https://path.to/license","openproject":1,' +
        '"govwideReuseproject":0,"closedproject":0,"exemption":null,' +
        ' "projectTags":[';

      //loop through project tags
      if (jsoninventory[i].description != null)

      {
        var tagwords = jsoninventory[i].description;

        //var tags = (tagwords).split(" ");
        var tags = stopwords.remove(tagwords);

        for (var k = 0; k < tags.length; k++) {
          if ((tags[k] == null || tags[k] == '') && ((k + 1) != tags.length)) {
            continue;
          }
          codegovinventory_projects += '{"tag":"' + tags[k] + '"}';

          if (k + 1 < tags.length) {
            codegovinventory_projects += ',';
          }
        }
      }
      codegovinventory_projects += ']'; //end tags
      //end tag section

      //start language section:
      codegovinventory_projects += ',"codeLanguage":[';


      if (jsoninventory[i].language != null) {
        var language = jsoninventory[i].language;


        codegovinventory_projects += '{"language":"' + language + '"}';



      }
      codegovinventory_projects += ']}'; //end languages

      if (i + 1 < jsoninventory.length) {
        codegovinventory_projects += ',';
      }
      //end language section
    }

    codegovinventory = codegovinventory_start + codegovinventory_projects + ']}';


    //console.log(prettyjson.render(codegovinventory, options));

    //res.send( prettyjson.render(codegovinventory, options));
    res.send(codegovinventory);


  });
});


/* ------------------------------------------------------------------ *
                            API ROUTES
 * ------------------------------------------------------------------ */

var router = express.Router(); // get an instance of the express Router
// middleware to use for all requests
router.use(function(req, res, next) {
  // do logging
  console.log('Hey, someone is using this!');
  next(); // make sure we go to the next routes and don't stop here
});

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

// all of our routes will be prefixed with /api
app.use('/api', router);


/* ------------------------------------------------------------------ *
                            SERVER
 * ------------------------------------------------------------------ */

// start the server
app.listen(port);
console.log('Listening on port ' + port);
