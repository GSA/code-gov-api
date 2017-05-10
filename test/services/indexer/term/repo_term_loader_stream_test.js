_ = require("lodash");
config = {
  "TERM_TYPES_TO_INDEX": [
    "name",
    "agency.name",
    "agency.acronym",
    "tags",
    "languages"]
};

const RepoTermLoaderStream = require("../../../../services/indexer/term/repo_term_loader_stream");


describe("RepoTermLoaderStream", () => {
  var termIndexerMock = {
    logger: {
      info: function() {}
    }
  };

  describe("#_transform", () => {
    it("does not raise an error when passed a repo with an undefined or null term", (done) => {
      var repo = {
        "name": "frog",
        "agency.name": undefined,
        "agency.acronym": null
      };
      var repoTermLoaderStream = new RepoTermLoaderStream(termIndexerMock);
      repoTermLoaderStream._transform(repo, null, done);
    });
  });
});