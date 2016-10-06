var mongoose     = require('mongoose'),
    mongoosastic = require('mongoosastic');
var Schema       = mongoose.Schema;

var RepoSchema   = new Schema({
    //_id : Schema.ObjectId,
    
    
    
      agency: String,
      
      projects:
    
        [
          {
          status: String,
          vcs: String,
          repository: String,
          name: String,
          repoID: Number,
          homepage: String,
          downloadURL: String,
          description: {type: String, es_indexed:true},
          projectTags: [String],
          codeLanguage: {type: [String], es_indexed:true},
          updated: { 
            
            type: [Date], default: Date.now,
            type: [Date], default: Date.now,
            type: [Date], default: Date.now 
          
          },
          contact: { 
            
            type: [String], email: String,
            type: [String], name: String,
            type: [String], twitter: String,
            type: [String], phone: String
          },
          partners: { 
            
            name: String,
            email: String
            
          },
        
          codeLanguage: {type: [String], es_indexed:true},  
          
          
          license: {type: [String], es_indexed:true},
          openSourceProject: Boolean,
          govwideReuseproject:  Boolean,
          closedproject: Boolean,
          exemption: String
        }
      ]
          
    },{strict:false}); //only parameters that are specified here should be saved to DB
    
RepoSchema.plugin(mongoosastic, {hosts: [
    'localhost:9200'
  ]})

;  

module.exports = mongoose.model('Repo', RepoSchema);



