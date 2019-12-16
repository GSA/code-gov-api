const agencies_es_response = {
	"took": 4,
	"timed_out": false,
	"_shards": {
		"total": 5,
		"successful": 5,
		"skipped": 0,
		"failed": 0
	},
	"hits": {
		"total": 26,
		"max_score": 0,
		"hits": [{
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "ED_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "ED",
				"term": "ED",
				"term_type": "agency.acronym",
				"count": 50,
				"count_normalized": 0.024330900243309004
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "USDA_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "USDA",
				"term": "USDA",
				"term_type": "agency.acronym",
				"count": 27,
				"count_normalized": 0.013138686131386862
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "DOJ_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "DOJ",
				"term": "DOJ",
				"term_type": "agency.acronym",
				"count": 55,
				"count_normalized": 0.0267639902676399
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "USAID_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "USAID",
				"term": "USAID",
				"term_type": "agency.acronym",
				"count": 2,
				"count_normalized": 0.0009732360097323601
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "NSF_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "NSF",
				"term": "NSF",
				"term_type": "agency.acronym",
				"count": 32,
				"count_normalized": 0.015571776155717762
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "CFPB_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "CFPB",
				"term": "CFPB",
				"term_type": "agency.acronym",
				"count": 261,
				"count_normalized": 0.12700729927007298
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "SSA_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "SSA",
				"term": "SSA",
				"term_type": "agency.acronym",
				"count": 131,
				"count_normalized": 0.06374695863746958
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "HHS_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "HHS",
				"term": "HHS",
				"term_type": "agency.acronym",
				"count": 56,
				"count_normalized": 0.027250608272506083
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "DOD_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "DOD",
				"term": "DOD",
				"term_type": "agency.acronym",
				"count": 17,
				"count_normalized": 0.00827250608272506
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "HUD_agency.acronym",
			"_score": 0,
			"_source": {
				"term_key": "HUD",
				"term": "HUD",
				"term_type": "agency.acronym",
				"count": 172,
				"count_normalized": 0.08369829683698297
			}
		}]
	}
};

const agencies_es_query = {
	"query": {
		"function_score": {
			"query": {
				"bool": {
					"filter": {
						"bool": {
							"should": [{
								"term": {
									"term_type": "agency.acronym"
								}
							}]
						}
					}
				}
			},
			"functions": [{
				"field_value_factor": {
					"field": "count_normalized",
					"factor": 0.25
				}
			}],
			"boost_mode": "multiply"
		}
	},
	"size": 10,
	"from": 0
};

const agency_es_query = {
	"size": 10,
	"from": 0,
	"query": {
		"bool": {
			"must": [{
				"match": {
					"term": "SSA"
				}
			}, {
				"match": {
					"term_type": "agency.acronym"
				}
			}]
		}
	}
};

module.exports = {
  agencies_es_response,
  agencies_es_query,
  agency_es_query
}
