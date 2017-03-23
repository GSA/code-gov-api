/******************************************************************************

  FORMATTER: a service which formats json objects, adding new fields and mod-
  ifying existing ones as necessary for consumption by the API

******************************************************************************/

const _                   = require("lodash");
const moment              = require("moment");
const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");
const request             = require("request");


class Formatter {

  constructor() {
    this.logger = new Logger({ name: "formatter" });
  }

  _formatDate(date) {
    return moment(date).toJSON();
  }

  _formatDates(repo) {
    if (repo.updated) {
      if (repo.updated.metadataLastUpdated) {
        repo.updated.metadataLastUpdated =
          this._formatDate(repo.updated.metadataLastUpdated);
      }
      if (repo.updated.lastCommit) {
        repo.updated.lastCommit =
          this._formatDate(repo.updated.lastCommit);
      }
      if (repo.updated.sourceCodeLastModified) {
        repo.updated.sourceCodeLastModified =
          this._formatDate(repo.updated.sourceCodeLastModified);
      }
    }
  }
  _formatEvents(repo) {
     // add event activity to repo for GitHub repos
    var eventsurl = repo.repository;
    var limit = 1, jsoninventory, eventsfeed=[], eventsfeed_start, eventsfeed_end=']', eventsfeed_projects="";
    
    
    if (!eventsurl.includes("github.com")){
      repo["events"] = [];
      }
    else{
      eventsurl = eventsurl.replace("https://github.com/","https://api.github.com/repos/");
      eventsurl+="/events";
      
      var options =  {
        url: eventsurl+"?client_id="+process.env.CLIENT_ID+"&client_secret="+process.env.CLIENT_SECRET,
        headers: { 'User-Agent':'request', 'Accept': 'application/vnd.github.full+json'}
        }
      
      request (options, function(error,response,body){
        console.log("URL="+options.url);
        eventsfeed='test';
        console.log('error: ', error);
        console.log('statuscode: ', response && response.statusCode);
        //console.log('body: ',body);
        if (response.statusCode!=404 && response.statusCode!=403)
        { jsoninventory = JSON.parse(body);  
        eventsfeed_start = "[";
        
        for (var i = 0; i < Math.min(limit,jsoninventory.length); i++) {
              //console.log(jsoninventory[i].type);
      eventsfeed_projects +=
        "{\"id\": \""+jsoninventory[i].repo.id +"\",\"name\": \"" + jsoninventory[i].repo.name + "\",\"type\":\"" +
        (jsoninventory[i].type).replace("Event","") + "\",\"user\":\"" + jsoninventory[i].actor.display_login +
        "\",\"time\": \"" + jsoninventory[i].created_at +"\"";

      //loop through type of event
      if (jsoninventory[i].type == "PushEvent")

      {
        
          eventsfeed_projects += ",\"message\": \""+jsoninventory[i].payload.commits[0].message+"\", \"url\":\""+jsoninventory[i].payload.commits[0].url+"\"";


       
      }
      else if (jsoninventory[i].type == "PullRequestEvent")

      {
        console.log(jsoninventory[i].payload.pull_request.title);
          eventsfeed_projects += ",\"message\": \""+jsoninventory[i].payload.pull_request.title+"\", \"url\":\""+jsoninventory[i].payload.pull_request.url+"\"";


       
      }
      else if (jsoninventory[i].type == "IssueCommentEvent")

      {
        
          eventsfeed_projects += ",\"message\": \""+jsoninventory[i].payload.issue.title+"\", \"url\":\""+jsoninventory[i].payload.issue.url+"\"";
       
      }
eventsfeed_projects += "}";
      
        if (i + 1 < Math.min(limit,jsoninventory.length)) {
        eventsfeed_projects += ',';
      }
    }
       eventsfeed = eventsfeed_start + eventsfeed_projects + eventsfeed_end;
         console.log("eventsfeed: "+eventsfeed_projects);
      if(eventsfeed_projects!=undefined) {
        repo.events=JSON.parse(eventsfeed_projects);
      
         console.log("repo name: "+repo["name"]);
         console.log("events desc: "+repo["events"]);
         console.log(JSON.parse(eventsfeed_projects));
      }
         
        } //if no error
        else{
          // this never runs: repo["events"] = ['{x}'];
          
        }
        
        })
      //repo["events"] = eventsfeed + ']';
      repo.events=JSON.parse(eventsfeed);
      //repo["events"] = ['{y}'];
      
    } //else
    
    
    return repo;
    
  }

  _formatRepo(repo) {
    // add repoId using a combination of agency acronym, organization, and
    // project name fields
    let repoId = Utils.transformStringToKey([
      repo.agency.acronym,
      repo.organization,
      repo.name
    ].join("_"));
    repo["repoID"] = repoId;
    

    // remove `id` from agency object
    if (repo.agency && repo.agency.id) {
      delete repo.agency.id;
    }
    this._formatEvents(repo);
    this._formatDates(repo);

    return repo;
  }

  formatRepo(repo, callback) {
    var formattedRepo;
    try {
      formattedRepo = this._formatRepo(repo);
    } catch (err) {
      this.logger.error(`Error when formatting repo: ${err}`);
      return callback(err, repo);
    }

    this.logger.info(`Formatted repo ${repo.name} (${repo.repoID}).`);
    return callback(null, repo);
  }

}

module.exports = new Formatter();
