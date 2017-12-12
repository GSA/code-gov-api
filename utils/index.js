const _                           = require("lodash");
const latinize                    = require("latinize");

class Utils {

  /**
   * Transform passed string into RepoId
   * @param {string} text 
   */
  static transformStringToKey(text) {
    return latinize(text)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s\s+/g, " ")
      .replace(/ /g, "_")
      .replace("and_", "")
      .replace("of_", "")
      .replace("the_", "");
  }

  /**
   * Flaten Elasticsearch mappings.
   * @param {object} mapping 
   */
  static getFlattenedMappingProperties(mapping) {
    let props = {};

    const _recurseMappingTree = (mappingTree, pathArr) => {
      if (mappingTree["properties"]) {
        _recurseMappingTree(mappingTree["properties"], pathArr);
      } else if (mappingTree["type"]) {
        props[pathArr.join(".")] = mappingTree["type"];
      } else {
        Object.keys(mappingTree).forEach((key) => {
          _recurseMappingTree(mappingTree[key], pathArr.concat(key));
        });
      }
    };

    _recurseMappingTree(mapping, []);
    return props;
  }

  /**
   * Flaten Elasticsearch mappings by type.
   * @param {object} mapping 
   */
  static getFlattenedMappingPropertiesByType(mapping) {
    let props = {};

    const _recurseMappingTree = (mappingTree, pathArr) => {
      if (mappingTree["properties"]) {
        //We need to add any nested objects for groupings.
        if (mappingTree["type"] == "nested") {
          if (!props[mappingTree["type"]]) {
            props[mappingTree["type"]] = [];
          }
          props[mappingTree["type"]].push(pathArr.join("."));
        }
        _recurseMappingTree(mappingTree["properties"], pathArr);
      } else if (mappingTree["type"]) {
        if (!props[mappingTree["type"]]) {
          props[mappingTree["type"]] = [];
        }
        props[mappingTree["type"]].push(pathArr.join("."));
      } else {
        Object.keys(mappingTree).forEach((key) => {
          _recurseMappingTree(mappingTree[key], pathArr.concat(key));
        });
      }
    };

    _recurseMappingTree(mapping, []);
    return props;
  }

  /**
   * Delete specified keys from objects in passed collection.
   * @param {Array[object]} collection - collections of objects to have keys deleted
   * @param {Array} excludeKeys - List of keys to be deleted.
   */
  static omitDeepKeys(collection, excludeKeys) {
    const omitFn = (value) => {
      if (value && typeof value === 'object') {
        excludeKeys.forEach((key) => {
          delete value[key];
        });
      }
    };
    return _.cloneDeepWith(collection, omitFn);
  }

  /**
   * Delete private object keys ( prefixed with `_` ) from objects in passed collection.
   * @param {Array[object]} collection - list of objects to have keys deleted
   */
  static omitPrivateKeys(collection) {
    const omitFn = (value) => {
      if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
          if (key[0] === "_") {
            delete value[key];
          }
        });
      }
    };
    return _.cloneDeepWith(collection, omitFn);
  }

  /**
   * Remove duplicate items from passed collections.
   * @param {*} collection1 
   * @param {*} collection2 
   */
  
  static removeDupes(collection1, collection2) {
    return _.filter(collection1, (obj) => {
      return !_.find(collection2, obj); 
    });
  }

  /**
   * Extract schema version from code.json
   * @param {object} codeJson 
   */
  static getCodeJsonVersion(codeJson) {
    if(codeJson.version) {
      return codeJson.version;
    } else {
      if(codeJson.agency && codeJson.projects) {
        return '1.0.1';
      } else if(codeJson.agency && codeJson.releases) {
        return '2.0.0';
      } else {
        return '1.0.0';
      }
    }
  }

  /**
   * Extract repositories from code.json by checking the schema version
   * @param {object} codeJson 
   * @returns {array} Array with repositories / projects found in the code.json
   */
  static getCodeJsonRepos(codeJson) {
    const version = this.getCodeJsonVersion(codeJson);
    const version2RegExp = /^2(\.\d+){0,2}$/;

    if(version2RegExp.test(version)) {
      return codeJson.releases ? codeJson.releases : null;
    } else {
      return codeJson.projects ? codeJson.projects : null;
    }
  }
}

module.exports = Utils;
