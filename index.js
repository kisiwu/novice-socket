const SocketApp = require('./lib/app');
const SocketNamespace = require('./lib/namespace');
// utils
const errorHandler = require('./lib/utils/errorHandler');
const explodeData = require('./lib/utils/explodeData');
const toArray = require('./lib/utils/toArray');

module.exports = exports = SocketApp;

/**
 * @param {string} [path]
 */
exports.Namespace = function(path) {
  return new SocketNamespace(path);
};

/**
 * @description utils
 */
exports.utils = {
  errorHandler,
  explodeData,
  toArray
};