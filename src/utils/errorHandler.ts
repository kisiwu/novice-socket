import { Controller } from '../definitions';

function errorHandler(fn: Controller, errorEvent?: string): Controller {
  const ctrl: Controller = function (req, res, next) {
    try {
      fn(req, res, next);
    } catch (err) {
      let e = err;
      if (err instanceof Error) {
        e = {
          name: err.name,
          message: err.message
        };
      }
      res(errorEvent || ('error:' + req.event.name), e);
    }
  };
  return ctrl;
}

export default errorHandler;