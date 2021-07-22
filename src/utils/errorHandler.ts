import { Controller } from '../definitions';

function errorHandler<DataType, ErrorType>(fn: Controller<DataType, ErrorType>, errorEvent?: string): Controller<DataType, ErrorType> {
  const ctrl: Controller<DataType, ErrorType> = function (req, res, next) {
    /**
     * To avoid calling 'next' multiple times
     */
    let calledNext = false;
    try {
      fn(req, res, (err) => {
        calledNext = true;
        next(err);
      });
    } catch (err) {
      let e = err;
      if (err instanceof Error) {
        e = {
          name: err.name,
          message: err.message
        };
      }
      if (!calledNext) {
        next(e);
      }
      res(errorEvent || ('error:' + req.event.name), e);
    }
  };
  return ctrl;
}

export default errorHandler;