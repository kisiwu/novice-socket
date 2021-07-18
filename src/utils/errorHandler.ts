import { Controller } from '../definitions';

function errorHandler(fn: (...args: unknown[]) => void, errorEvent?: string): Controller {
  const ctrl: Controller = function (req, res, next, ...args) {
    try {
      const allArgs = [req, res, next].concat(args);
      fn.apply(fn, allArgs);
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