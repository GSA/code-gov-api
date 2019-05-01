const _ = require("lodash");

class Utils {
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
   * Bunyan request serializer that prevents API tokens from leaking into the logs
   * @param {object} request - Expressjs request object
   * @returns {object} request serializer object used by Bunyan
   */
  static getLoggerRequestSerializer(request) {
    const cleanHeaders = Utils.omitDeepKeys(request.headers, ['x-api-key']);
    return {
      id: request.id,
      method: request.method,
      url: request.url,
      headers: cleanHeaders,
      remoteAddress: request.connection.remoteAddress,
      remotePort: request.connection.remotePort
    };
  }

  /**
   * Bunyan response serializer that prevents API tokens from leaking into the logs
   * @param {object} response - Expressjs response object
   * @returns {object} response serializer object used by Bunyan
   */
  static getLoggerResponseSerializer(response) {
    return {
      statusCode: response.statusCode,
      header: Utils.omitDeepKeys(response._header, ['x-api-key'])
    };
  }
}

module.exports = Utils;
