
function errorHandler(fn, errorEvent) {
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
      res(errorEvent || ('error:' + req.event.name), err);
    }
  };
  return ctrl;
};

module.exports = errorHandler;