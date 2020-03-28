const SocketApp = require('./lib/app');
const NspBuilder = require('./lib/nspBuilder');
// utils
const errorHandler = require('./lib/utils/errorHandler');
const explodeData = require('./lib/utils/explodeData');
const toArray = require('./lib/utils/toArray');

module.exports = exports = SocketApp;

/**
 * @param {string} [namespace]
 */
exports.NspBuilder = function(namespace) {
  return new NspBuilder(namespace);
};

/**
 * @description utils
 */
exports.utils = {
  errorHandler,
  explodeData,
  toArray
};