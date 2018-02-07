const RepoTermLoaderStream = require("../../../../services/indexer/term/repo_term_loader_stream");

describe("RepoTermLoaderStream", () => {
  let termIndexerMock = {
    logger: {
      info: function() {},
      debug: function() {}
    }
  };
  let config;

  before(function() {
    config = {
      TERM_TYPES_TO_INDEX: [
        "name",
        "agency.name",
        "agency.acronym",
        "tags",
        "languages"],
    };
  });

  describe("#_transform", () => {
    it("does not raise an error when passed a repo with an undefined or null term", (done) => {
      let repo = {
        "name": "frog",
        "agency.name": undefined,
        "agency.acronym": null
      };
      let repoTermLoaderStream = new RepoTermLoaderStream(termIndexerMock, config);
      repoTermLoaderStream._transform(repo, null, done);
    });
  });
});
