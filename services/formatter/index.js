/******************************************************************************

  FORMATTER: a service which formats json objects, adding new fields and mod-
  ifying existing ones as necessary for consumption by the API

  There are methods that make extra calls to the GitHub API for repo metadata.
  However, most of these calls are currently turned off in the code since the
  number of calls generated exceeds the existing API limits.

  TODO:  Ideally this code should be rewritten to use the new GitHub API v4
  (GraphQL), which should end up making much fewer calls. At time of writing,
  the v4 API has no equivalent to the v3 "/contributors" endpoint, and the
  "/events" endpoint is split over multiple objects based on the subject of
  the event (issues, forks, pull requests, etc.)

  Also, the GitHub metadata fetching code should be split into a different
  class with a more meaningful name than "Formatter".

  Once the new events structure is in place, fix indexes/repo/mapping.json
  to reflect the structure correctly to ElasticSearch.

  Examples of the data structures added to the repo object:

  events: [
    {
      "id": "62409417",
      "name": "department-of-veterans-affairs/vets-api",
      "type": "Delete",
      "user": "aub",
      "time": "2016-11-02T19:06:20Z"

    }, {
      "id": "62409417",
      "name": "department-of-veterans-affairs/vets-api",
      "type": "Push",
      "user": "aub",
      "time": "2016-11-02T19:06:19Z",
      "message": "return the user (#418)",
      "url": "https://api.github.com/repos/department-of-veterans-affairs/vets-api/commits/e552eb2b81851ff5cdbe7fd7d042edb3014932c5"
    }, {
      "id": "62409417",
      "name": "department-of-veterans-affairs/vets-api",
      "type": "PullRequest",
      "user": "aub",
      "time": "2016-11-02T19:06:18Z",
      "message": "return the user",
      "url": "https://api.github.com/repos/department-of-veterans-affairs/vets-api/pulls/418"
    },
    ...
  ]
  (Note: The "id" and "name" values in the above objects refer to the repo,
  and are always identical for events in a given repo. We should probably
  remove these in future work.)

  codeLanguage: [
    {
			"language": "CSS"
		}
  ]
  (This should probably be streamlined to a list of strings.)

  license_name: "CC0"

  As for "contributors", there's no code using that yet, so it's fine to
  replace that with whatever seems best, or leave it unimplemented for the
  moment.

******************************************************************************/

const JsonFile = require('jsonfile');
const Logger = require("../../utils/logger");
const moment = require("moment");
const path = require('path');
const request = require("request");
const request_promise = require("request-promise");
const Utils = require("../../utils");
const sleep = require("sleep");

let lastupdated, etag;

let licensename = "";
let contributors;
let contributordata = [];
let events;
let eventdata;
/* eslint-disable */
let eventfeed;
/* eslint-enable */
let languages;
let languagedata;

class Formatter {
  constructor() {
    this.logger = new Logger({ name: "formatter" });
  }

  _formatDate(date) {
    return moment(date, 'YYYY-MM-DD').utc().toJSON();
  }

  _formatDates(repo) {
    if (repo.date) {
      if (repo.date.lastModified) {
        repo.date.lastModified = this._formatDate(repo.date.lastModified);
      }
      if (repo.date.metadataLastUpdated) {
        repo.date.metadataLastUpdated = this._formatDate(repo.date.metadataLastUpdated);
      }
      if (repo.date.created) {
        repo.date.created = this._formatDate(repo.date.created);
      }
    }
  }
  _formatLicense(repo) {
    let license_url = repo.repository;
    if (repo.license != null) {
      license_url = license_url.replace(
        "//github.com/",
        "//api.github.com/repos/"
      );

      let options = {
        uri: license_url +
          "?client_id=" +
          process.env.CLIENT_ID +
          "&client_secret=" +
          process.env.CLIENT_SECRET,
        headers: {
          "User-Agent": "code-gov-api",
          Accept: "application/vnd.github.drax-preview+json",
          "Content-Type": "application/json"
        },
        json: true
      };
      request_promise(options)
        .then(function(res) {
          //console.log(body);

          if (res.license) {
            // console.log("JSON body: "+JSON.stringify(res.license.name));

            //console.log("whats in license: "+(repo.license))
            licensename = res.license.name;
            // console.log("license name: "+licensename);
            //  repo.license=licensename;
          }
        })
        .catch(function(err) {
          this.logger.error("license error:", err);
        });
    }
    return licensename;
  }

  _formatEvents(repo) {
    // add event activity to repo for GitHub repos

    let i, limit = 1;
    let eventsurl = repo.repository;

    if (!eventsurl.includes("github.com")) {
      repo["events"] = [];
    } else {
      //sleep.msleep(Math.floor(Math.random()*(2500-1000+1)+1000));
      sleep.msleep(Math.floor(Math.random() * (1000 - 100 + 1) + 250));
      eventsurl = eventsurl.replace(
        "https://github.com/",
        "https://api.github.com/repos/"
      );
      eventsurl += "/events";

      //console.log("eventsurl: " + eventsurl);

      let options = {
        url: eventsurl +
          "?client_id=" +
          process.env.CLIENT_ID +
          "&client_secret=" +
          process.env.CLIENT_SECRET,
        headers: {
          "User-Agent": "code-gov-api",
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        }
      };

      request(options, function(err, response, body) {
        if (err) {
          this.logger.error("event error: " + err);
        } else {
          try {
            events = JSON.parse(body);

            if (events[0] != undefined) {
              //console.log("type: " + events[0].type);
              for (i = 0; i < Math.min(limit, events.length); i++) {
                //eventdata= [{"avatar_url":contributors[i].avatar_url}];

                eventdata +=
                  "{'id': '" +
                  events[i].repo.id +
                  "','name': '" +
                  events[i].repo.name +
                  "','type':'" +
                  events[i].type.replace("Event", "") +
                  "','user':'" +
                  events[i].actor.display_login +
                  "','time': '" +
                  events[i].created_at +
                  "'";

                //loop through type of event
                if (events[i].type == "PushEvent") {
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.commits[0].message +
                    "', 'url':'" +
                    events[i].payload.commits[0].url +
                    "'";
                } else if (events[i].type == "PullRequestEvent") {
                  //console.log(events[i].payload.pull_request.title);
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.pull_request.title +
                    "', 'url':'" +
                    events[i].payload.pull_request.url +
                    "'";
                } else if (events[i].type == "CreateEvent") {
                  //console.log(events[i].payload.ref);
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.ref_type +
                    "', 'reference':'" +
                    events[i].payload.ref +
                    "'";
                } else if (events[i].type == "IssueCommentEvent") {
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.issue.title +
                    "', 'url':'" +
                    events[i].payload.issue.url +
                    "'";
                } else if (events[i].type == "IssuesEvent") {
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.issue.title +
                    "', 'url':'" +
                    events[i].payload.issue.url +
                    "'";
                } else if (events[i].type == "WatchEvent") {
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.action +
                    "', 'user':'" +
                    events[i].actor.login +
                    "'";
                } else if (events[i].type == "ForkEvent") {
                  eventdata +=
                    ",'message': '" +
                    events[i].payload.forkee.full_name +
                    "', 'description':'" +
                    events[i].payload.forkee.description +
                    "'";
                }
                eventdata += "}";

                if (i + 1 <= Math.min(limit, events.length)) {
                  eventdata += ",";
                }
              }
              eventfeed = "[" + eventdata + "]";
            }
          } catch (e) { //closing try
            this.logger.error(e);
          }
        } //close else
      });
    } //else

    return eventdata;
  }

  _formatContributors(repo) {
    // add event activity to repo for GitHub repos

    let i;

    let contributorsurl = repo.repository;

    //contributordata.push({"login":"testuser","avatar_url":"https://avatars2.githubusercontent.com/u/6654994?v=3","html_url":"https://github.com/lukad03"});
    //contributordata.push({"login":"testuser2","avatar_url":"https://avatars2.githubusercontent.com/u/6654994?v=3","html_url":"https://github.com/lukad04"});

    if (!contributorsurl.includes("github.com")) {
      repo["contributors"] = [];
    } else {
      //sleep.msleep(Math.floor(Math.random()*(2500-1000+1)+1000));
      sleep.msleep(Math.floor(Math.random() * (1000 - 100 + 1) + 250));
      contributorsurl = contributorsurl.replace(
        "https://github.com/",
        "https://api.github.com/repos/"
      );
      contributorsurl += "/contributors";

      //console.log("contributorsurl: " + contributorsurl);

      let options = {
        url: contributorsurl +
          "?client_id=" +
          process.env.CLIENT_ID +
          "&client_secret=" +
          process.env.CLIENT_SECRET,
        headers: {
          "User-Agent": "code-gov-api",
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        }
      };

      request(options, function(err, response, body) {
        if (err) {
          this.logger.error("contributor error: " + err);
        } else {
          try {
            contributordata.length = 0; //clear the array
            contributors = JSON.parse(body);
            if (contributors[0] != undefined) {
              //console.log("login: " + contributors[0].login);
              for (i = 0; i < contributors.length; i++) {
                contributordata.push({
                  login: contributors[i].login,
                  avatar_url: contributors[i].avatar_url,
                  html_url: contributors[i].html_url
                });
              }
            }
          } catch (e) { //closing try
            this.logger.error(e);
          }
        }
      });
    } //else

    return contributordata;
  }

  _formatLanguages(repo) {
    // add language to repo for GitHub repos

    let i;

    let languagesurl = repo.repository;

    if (!languagesurl.includes("github.com")) {
      repo["languages"] = [];
    } else {
      sleep.msleep(Math.floor(Math.random() * (1000 - 100 + 1) + 250));

      languagesurl = languagesurl.replace(
        "https://github.com/",
        "https://api.github.com/repos/"
      );
      languagesurl += "/languages";

      //console.log("languagesurl: " + languagesurl);

      let options1 = {
        url: languagesurl +
          "?client_id=" +
          process.env.CLIENT_ID +
          "&client_secret=" +
          process.env.CLIENT_SECRET,
        headers: {
          "User-Agent": "code-gov-api",
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=604800",
          "Access-Control-Expose-Headers": "ETag,X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, "
            + "X-RateLimit-Reset, X-Poll-Interval, Last-Modified"
        }
      };

      request(options1, function(err, response, body) {
        if (err) {
          this.logger.error("initial language request error: " + err);
        } else {
          this.logger.debug('body', body);
          etag = response.headers["etag"];
          lastupdated = response.headers["last-modified"];
        }
      });

      let options2 = {
        url: languagesurl +
          "?client_id=" +
          process.env.CLIENT_ID +
          "&client_secret=" +
          process.env.CLIENT_SECRET,
        headers: {
          "User-Agent": "code-gov-api",
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=604800",
          "Access-Control-Expose-Headers": "ETag,X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, "
            + "X-RateLimit-Reset, X-Poll-Interval, Last-Modified",
          "If-None-Match": etag,
          "If-Modified-Since": lastupdated
        }
      };

      request(options2, function(err, response, body) {
        if (err) {
          this.logger.consoleerror("languages error: " + err);
        } else if (response.headers["status"] == "304 Not Modified") {
          //console.log("Status is: " + response.headers["status"]);
          //console.log("Requests Remaining is: " + response.headers["x-ratelimit-remaining"]);
          //console.log("304 Not Modified");
          return repo.languages;
        } else {
          //console.log("Status is: " + response.headers["status"]);
          //console.log("ETag is: " + response.headers["etag"]);
          //console.log("Requests Remaining is: " +response.headers["x-ratelimit-remaining"]);

          try {
            //languagedata.length=0; //clear the array
            languages = JSON.parse(body);
            if (languages != undefined) {
              //console.log("final url: "+options.url);
              //console.log("body: " +JSON.stringify(languages));
              //console.log("language: " +Object.keys(languages)[0]);
              for (i = 0; i < languages.length; i++) {
                languagedata.push(Object.keys(languages)[i]);
              }
            }
          } catch (e) { //closing try
            this.logger.error(e);
          }
        }
      });
    } //else

    return languagedata;
  }

  _getUsageTypeExemptionText(repo) {
    const exemptionTexts = JsonFile.readFileSync(path.join(__dirname, './repo_upgrade_texts.json'));
    let usageType, exemptionText;

    if (repo.openSourceProject === 1) {
      usageType = 'openSource';
      exemptionText = exemptionTexts.openSource;
    } else if (repo.governmentWideReuseProject === 1) {
      usageType = 'governmentWideReuse';
      exemptionText = exemptionTexts.governmentWideReuse;
    } else if (String(repo.exemption) === '1') {
      usageType = 'exemptByLaw';
      exemptionText = exemptionTexts.exemptByLaw;
    } else if (String(repo.exemption) === '2') {
      usageType = 'exemptByNationalSecurity';
      exemptionText = exemptionTexts.exemptByNationalSecurity;
    } else if (String(repo.exemption) === '3') {
      usageType = 'exemptByAgencySystem';
      exemptionText = exemptionTexts.exemptByAgencySystem;
    } else if (String(repo.exemption) === '4') {
      usageType = 'exemptByAgencyMission';
      exemptionText = exemptionTexts.exemptByAgencyMission;
    } else if (String(repo.exemption) === '5') {
      usageType = 'exemptByCIO';
      exemptionText = exemptionTexts.exemptByCIO;
    } else {
      usageType = null;
      exemptionText = null;
    }

    return {usageType, exemptionText};

  }
  _upgradeOptionalFields(repo) {
    repo.vcs = repo.vcs || '';
    repo.disclaimerText = repo.disclaimerText || '';
    repo.disclaimerURL = repo.disclaimerURL || '';
    repo.relatedCode = [{
      codeName: '',
      codeURL: '',
      isGovernmentRepo: false
    }];
    repo.reusedCode = [{
      name: '',
      URL: ''
    }];
  }
  _upgradeToPermissions(repo) {

    const { usageType, exemptionText } = this._getUsageTypeExemptionText(repo);
    repo.permissions = { 
      usageType, 
      exemptionText,
      licenses: [{
        URL: repo.license ? repo.license: '',
        name: ''
      }]
    };

    delete repo.license;
    delete repo.openSourceProject;
    delete repo.governmentWideReuseProject;
    delete repo.exemption;
    delete repo.exemptionText;
  }
  _upgradeUpdatedToDate(repo) {
    let lastModified = '', 
      metadataLastUpdated = '';

    if (repo.updated) {
      if (repo.updated.sourceCodeLastModified) {
        lastModified = this._formatDate(repo.updated.sourceCodeLastModified);
      }
  
      if (repo.updated.metadataLastUpdated) {
        metadataLastUpdated = this._formatDate(repo.updated.metadataLastUpdated);
      }
  
      delete repo.updated;
    }

    repo.date = {
      created: '',
      lastModified: lastModified,
      metadataLastUpdated: metadataLastUpdated
    };
  }
  _upgradeProject(repo) {
    repo.laborHours = null;
    repo.repositoryURL = repo.repository ? repo.repository : '';
    repo.homepageURL = repo.homepage ? repo.homepage : '';

    delete repo.repository;
    delete repo.homepage;
  
    this._upgradeToPermissions(repo);  
    this._upgradeUpdatedToDate(repo);
    this._upgradeOptionalFields(repo);
  
    return repo;
  }

  _formatRepo(repo){
    // add repoId using a combination of agency acronym, organization, and
    // repo name fields
    let repoId = Utils.transformStringToKey(
      [repo.agency.acronym, repo.organization, repo.name].join("_")
    );
    repo["repoID"] = repoId;

    // remove `id` from agency object
    if (repo.agency && repo.agency.id) {
      delete repo.agency.id;
    }
    //repo.languages = this._formatLanguages(repo);
    //repo.license_name=this._formatLicense(repo);
    //repo.contributors=this._formatContributors(repo);
    //repo.events=JSON.parse(this._formatEvents(repo));
    this._formatDates(repo);

    return repo;
  }

  formatRepo(schemaVersion = '1.0.1', repo) {
    return new Promise((resolve, reject) => {
      let formattedRepo;
      try {
        if(schemaVersion === '2.0.0') {
          formattedRepo = this._formatRepo(repo);
        } else {
          this._upgradeProject(repo);
          formattedRepo = this._formatRepo(repo);
        }
        
        this.logger.debug('formatted repo', formattedRepo);
      } catch (error) {
        this.logger.error(`Error when formatting repo: ${error}`);
        reject(error);
      }
  
      this.logger.debug(`Formatted repo ${repo.name} (${repo.repoID}).`);
      resolve(repo);
    });
    
  }
}

module.exports = new Formatter();
