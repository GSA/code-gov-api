const _                   = require("lodash");
const Bodybuilder         = require("bodybuilder");
const moment              = require("moment");
const config              = require("../../config");
const Utils               = require("../../utils");
const Logger              = require("../../utils/logger");
const repoMapping         = require("../../indexes/repo/mapping_200.json");

const DATE_FORMAT = "YYYY-MM-DD";
const REPO_RESULT_SIZE_MAX = 3000;
const REPO_RESULT_SIZE_DEFAULT = 10;
const TERM_RESULT_SIZE_MAX = 100;
const TERM_RESULT_SIZE_DEFAULT = 5;
const ELASTICSEARCH_SORT_ORDERS = ['asc', 'desc'];
const ELASTICSEARCH_SORT_MODES = ['min', 'max', 'sum', 'avg', 'median'];
const searchPropsByType =
  Utils.getFlattenedMappingPropertiesByType(repoMapping["repo"]);

let logger = new Logger({name: "searcher"});

class Searcher {

  constructor(adapter) {
    this.client = adapter.getClient();
  }

  /***********************************************************************
                                REPO BY ID
   ***********************************************************************/

  _searchRepoById(id) {
    let body = new Bodybuilder();

    body.query("match", "repoID", id);
    let query = body.build("v2");
    logger.debug(query);

    return query;
  }

  // queries on repoID
  getRepoById(id, callback) {
    logger.info("Getting repo", {id});
    this.client.search({
      index: 'repos',
      type: 'repo',
      body: this._searchRepoById(id)
    }, (err, res) => {
      if(err) {
        logger.error(err);
        return callback(err);
      }
      // return callback(null, res);
      if(!res.hits || !res.hits.hits || !res.hits.hits[0]) {
        logger.info("No hits");
        return callback(null, {});
      }
      let repo = Utils.omitPrivateKeys(res.hits.hits[0]._source);
      //logger.info(repo);
      return callback(null, repo);
    });
  }

  /***********************************************************************
                              SEARCH FOR REPOS
   ***********************************************************************/

  _addMatchPhraseForFullText(body, q, field, boost) {
    let query = { "match_phrase": {} };
    query["match_phrase"][field] = {
      "query": q._fulltext
    };

    if (boost) {
      query["match_phrase"][field]["boost"] = boost;
    }

    body.query("bool", "should", query);
  }

  _addMatchForFullText(body, q, field) {
    let query = { "match": {} };
    query["match"][field] = q._fulltext;

    body.query("bool", "should", query);
  }

  _addCommonCutoffForFullText(body, q, field, boost) {
    let query = { "common": {} };
    query["common"][field] = {
      "query": q._fulltext,
      "cutoff_frequency": 0.001,
      "low_freq_operator": "and"
    };

    if (boost) {
      query["common"][field]["boost"] = boost;
    }

    body.query("bool", "should", query);
  }

  _addFullTextQuery(body, q) {
    if (q._fulltext) {
      // need to nest `_fulltext` query as a "must"
      let ftBody = new Bodybuilder();

      ftBody.query("bool", "should", {
        "multi_match": {
          "query": q._fulltext,
          "fields": ["repoID"]
        }
      });
      this._addMatchPhraseForFullText(ftBody, q, "agency._fulltext", 4);
      this._addCommonCutoffForFullText(ftBody, q, "agency._fulltext", 4);
      this._addMatchPhraseForFullText(ftBody, q, "description._fulltext");
      this._addCommonCutoffForFullText(ftBody, q, "description._fulltext");
      this._addMatchPhraseForFullText(ftBody, q, "tags", 4);
      this._addCommonCutoffForFullText(ftBody, q, "tags", 4);
      this._addMatchForFullText(ftBody, q, "codeLanguage.language", 4);
      this._addMatchForFullText(ftBody, q, "contact.name._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "contact.email._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "contact.twitter._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "contact.phone._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "partners.name._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "partners.email._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "contact.twitter._fulltext", 4);
      this._addMatchForFullText(ftBody, q, "license._fulltext", 4);

      let ftQuery = ftBody.build("v2")["query"];

      body.query("bool", "must", ftQuery);
    }
  }

  _addStringFilter(body, field, filter) {
    if (filter instanceof Array) {
      let orBody = new Bodybuilder();
      filter.forEach((filterElement) => {
        logger.info(filterElement);
        orBody.orFilter("term", field, filterElement.toLowerCase());
      });
      body.filter("bool", "and", orBody.build("v2"));
    } else {
      body.filter("term", field, filter.toLowerCase());
    }
  }

  _addStringFilters(body, q) {
    searchPropsByType["string"].forEach((field) => {
      if(q[field]) {
        this._addStringFilter(body, field, q[field]);
      }
    });
  }

  _addDateRangeFilters(body, q) {
    const _addRangeFilter = (field, lteRange, gteRange) => {
      let ranges = {};

      const _addRangeForRangeType = (rangeType, dateRange) => {
        if(dateRange) {
          dateRange = moment(dateRange);
          if(dateRange.isValid()) {
            ranges[rangeType] = dateRange.utc().format(DATE_FORMAT);
          } else {
            throw new Error(
              `Invalid date supplied for ${field}_${rangeType}. ` +
              `Please use format ${DATE_FORMAT} or ISO8601.`
            );
          }
        }
      };

      _addRangeForRangeType("lte", lteRange);
      _addRangeForRangeType("gte", gteRange);

      body.filter("range", field, ranges);
    };

    let possibleRangeProps = searchPropsByType["date"];
    possibleRangeProps.forEach((field) => {
      let lteRange = q[field + "_lte"];
      let gteRange = q[field + "_gte"];
      if(lteRange || gteRange) {
        _addRangeFilter(field, lteRange, gteRange);
      }
    });
  }

  _addSizeFromParams(body, q) {
    q.size = q.size || REPO_RESULT_SIZE_DEFAULT;
    let size = q.size > REPO_RESULT_SIZE_MAX ? REPO_RESULT_SIZE_MAX : q.size;
    let from = q.from || 0;
    body.size(size);
    body.from(from);
  }

  _addIncludeExclude(body, q) {
    let include = q.include || null;
    let exclude = q.exclude || null;
    let _source = {};
    const _enforceArray = (obj) => {
      if (!(obj instanceof Array)) {
        if (typeof(obj) === "string") {
          return [obj];
        } else {
          return [];
        }
      } else {
        return obj;
      }
    };

    if (include) {
      _source.include = _enforceArray(include);
    }
    if(exclude) {
      _source.exclude = _enforceArray(exclude);
    }

    if(Object.keys(_source).length) {
      body.rawOption("_source", _source);
    }
  }

  /**
   * This adds all of our data field filters to a bodybuilder object
   *
   * @param {any} body An instance of a Bodybuilder class
   * @param {any} q The query parameters a user is searching for
   */
  _addFieldFilters(body, q){
    this._addStringFilters(body, q);
    this._addDateRangeFilters(body, q);
  }

  /**
   * Adds sorting depending on query input parameters.
   *
   * @param {any} body An instance of a Bodybuilder class
   * @param {any} q The query parameters a user is searching for
   */
  _addSortOrder(body, q) {
    if(q['sort']) {
      const sortValues = [];
      q.sort.split(',').forEach(value => {
        if(value) {
          sortValues.push(value.split('__'));
        }
      });

      sortValues.forEach(sortValue => {
        let sortOptions = {};
        let sortField = sortValue[0];

        if(sortValue.length > 1) {
          sortValue.slice(1).forEach(item => {
            if (ELASTICSEARCH_SORT_ORDERS.includes(item)) {
              sortOptions.order = item;
            }
            if (ELASTICSEARCH_SORT_MODES.includes(item)) {
              sortOptions.mode = item;
            }
          });
          body.sort(sortField, sortOptions);
        } else {
          body.sort(sortField, 'asc');
        }
      });
    } else {
      body.sort('name', q['sort'] || 'asc');
    }
  }

  _searchReposQuery(q) {
    let body = new Bodybuilder();

    // this._addNestedFilters(body, q);
    this._addFieldFilters(body, q);
    this._addSizeFromParams(body, q);
    this._addIncludeExclude(body, q);
    this._addFullTextQuery(body, q);

    this._addSortOrder(body, q);

    let query = body.build("v2");

    logger.debug(query);
    return query;
  }

  searchRepos(requestQuery, callback) {
    logger.info("Repo searching", requestQuery);

    this.client.search({
      index: 'repos',
      type: 'repo',
      body: this._searchReposQuery(requestQuery)
    }, (error, elasticSearchResponse) => {
      if(error) {
        logger.error(error);
        return callback(error);
      }
      let repos = Utils.omitPrivateKeys(
        _.map(elasticSearchResponse.hits.hits, (hit) => {
          return hit._source;
        })
      );

      let formattedRes = {
        total: elasticSearchResponse.hits.total,
        repos: repos
      };
      return callback(null, formattedRes);
    });
  }

  /***********************************************************************
                              SEARCH FOR TERMS
   ***********************************************************************/

  _searchTermsQuery(q) {
    // TODO: use BodyBuilder more
    let body = new Bodybuilder();

    // add query terms (boost when phrase is matched)
    if (q.term) {
      body.query("match", "term_suggest", q.term);
      body.query("match", "term_suggest", q.term, {type: "phrase"});
    }

    // set the term types (use defaults if not supplied)
    let termTypes = config.TERM_TYPES_TO_SEARCH;
    if (q.term_type) {
      if (q.term_type instanceof Array) {
        termTypes = q.term_type;
      } else {
        termTypes = [q.term_type];
      }
    }
    termTypes.forEach((termType) => {
      body.orFilter("term", "term_type", termType);
    });

    // build the query and add custom fields (that bodyparser can't handle)
    let functionQuery = body.build("v2");
    // boost exact match
    if (q.term) {
      functionQuery.query.bool.should = {
        "match": {
          "term": q.term
        }
      };
    }

    // add scoring function
    functionQuery.functions = [{
      "field_value_factor": {
        "field": "count_normalized",
        "factor": .25
      }
    }];
    functionQuery.boost_mode = "multiply";

    // set the size, from
    let size = q.size || TERM_RESULT_SIZE_DEFAULT;
    size = size > TERM_RESULT_SIZE_MAX ? TERM_RESULT_SIZE_MAX : size;
    let from = q.from ? q.from : 0;

    // finalize the query
    let query = {
      "query": { "function_score": functionQuery },
      "size": size,
      "from": from
    };

    //logger.info(query);
    return query;
  }

  searchTerms(q, callback) {
    // logger.info("Term searching", q);
    this.client.search({
      index: 'terms',
      type: 'term',
      body: this._searchTermsQuery(q)
    }, (err, res) => {
      if(err) {
        logger.error(err);
        return callback(err);
      }
      // return callback(null, res);
      let formattedRes = {
        total: res.hits.total,
        terms: _.map(res.hits.hits, (hit) => {
          let source = hit._source;
          source.score = hit._score;
          return source;
        })
      };
      return callback(null, formattedRes);
    });
  }

  _searchTermByKey(key) {
    let body = new Bodybuilder();

    body.query("match", "term_key", key);

    let query = body.build("v2");
    // logger.info(query);

    return query;
  }

  // queries on term key
  getTermByKey(key, callback) {
    logger.info("Getting term", {key});
    this.client.search({
      index: 'terms',
      type: 'term',
      body: this._searchTermByKey(key)
    }, (err, res) => {
      if(err) {
        logger.error(err);
        return callback(err);
      }
      // return callback(null, res);
      if(!res.hits || !res.hits.hits || !res.hits.hits[0]) {
        return callback(null, {});
      }
      let term = Utils.omitPrivateKeys(res.hits.hits[0]._source);
      return callback(null, term);
    });
  }

}

module.exports = Searcher;
