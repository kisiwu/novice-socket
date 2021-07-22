import { Controller } from '../definitions';

function errorHandler<DataType, ErrorType>(fn: Controller<DataType, ErrorType>, errorEvent?: string): Controller<DataType, ErrorType> {
  const ctrl: Controller<DataType, ErrorType> = function (req, res, next) {
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