const terms_es_response = {
	"took": 2,
	"timed_out": false,
	"_shards": {
		"total": 5,
		"successful": 5,
		"skipped": 0,
		"failed": 0
	},
	"hits": {
		"total": 10217,
		"max_score": 0,
		"hits": [{
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "DMS Analysis Tool Manager_name",
			"_score": 0,
			"_source": {
				"term_key": "DMS Analysis Tool Manager",
				"term": "DMS Analysis Tool Manager",
				"term_type": "name",
				"count": 1,
				"count_normalized": 0.3333333333333333
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "Fasta File Splitter_name",
			"_score": 0,
			"_source": {
				"term_key": "Fasta File Splitter",
				"term": "Fasta File Splitter",
				"term_type": "name",
				"count": 1,
				"count_normalized": 0.3333333333333333
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "LC-IMS-MS Feature Finder_name",
			"_score": 0,
			"_source": {
				"term_key": "LC-IMS-MS Feature Finder",
				"term": "LC-IMS-MS Feature Finder",
				"term_type": "name",
				"count": 1,
				"count_normalized": 0.3333333333333333
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "pnnl/socialsim_name",
			"_score": 0,
			"_source": {
				"term_key": "pnnl/socialsim",
				"term": "pnnl/socialsim",
				"term_type": "name",
				"count": 1,
				"count_normalized": 0.3333333333333333
			}
		}, {
			"_index": "terms20191202_153206",
			"_type": "term",
			"_id": "Optimization, Inference and Learning for Advanced Networks_name",
			"_score": 0,
			"_source": {
				"term_key": "Optimization, Inference and Learning for Advanced Networks",
				"term": "Optimization, Inference and Learning for Advanced Networks",
				"term_type": "name",
				"count": 1,
				"count_normalized": 0.3333333333333333
			}
		}]
	}
};

module.exports = {
  terms_es_response
};
