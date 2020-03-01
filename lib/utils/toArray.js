/**
 * 
 * @param {*} value 
 * @param {string} [type] 
 * @param {Function} [fn]
 * @param {boolean} [throwErrorIfFoundUnvalidType]
 */
function toArray(value, type, fn, throwErrorIfFoundUnvalidType) {
  if (!Array.isArray(value)) {
    value = [value];
  }

  if (type && throwErrorIfFoundUnvalidType) {
    if(value.some(v => typeof v !== type)){
      throw new TypeError(`Expected type '${type}'`);
    }
  }
  if (type && !throwErrorIfFoundUnvalidType) {
    value = value.filter(v => typeof v === type);
  }
  if (typeof fn === 'function') {
    value = value.filter(fn);
  }

  return value;
}

module.exports = toArray;