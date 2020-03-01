
function errorHandler(fn) {
  var ctrl = function(req, res, next) {
    try {
      var args = Array.prototype.slice.call(arguments);
      fn.apply(fn, args);
    } catch(err) {
      if (err instanceof Error) {
        err = {
          name: err.name,
          message: err.message
        };
      }
      res(req.event.name + ' error', err);
    }
  };
  return ctrl;
};

module.exports = errorHandler;