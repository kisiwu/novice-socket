import { Controller } from '../definitions';

function errorHandler<T, E>(fn: Controller<T, E>, errorEvent?: string): Controller<T, E> {
  const ctrl: Controller<T, E> = function (req, res, next) {
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