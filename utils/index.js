const _                           = require("lodash");
const latinize                    = require("latinize");

class Utils {

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

  static omitDeepKeys(collection, excludeKeys) {
    const omitFn = (value) => {
      if (value && typeof value === 'object') {
        excludeKeys.forEach((key) => {
          delete value[key];
        });
      }
    }
    return _.cloneDeepWith(collection, omitFn);
  }

  static omitPrivateKeys(collection) {
    const omitFn = (value) => {
      if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
          if (key[0] === "_") {
            delete value[key];
          }
        });
      }
    }
    return _.cloneDeepWith(collection, omitFn);
  }

}

module.exports = Utils;
