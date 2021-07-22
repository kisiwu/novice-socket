import { Controller, Request, Response, NextFunc } from '../definitions';

type Func<DataType, ErrorType> = (this: {
  req: Request<DataType>,
  res: Response,
  next: NextFunc<ErrorType>
}, ...args: DataType[]) => void;

function explodeData<DataType, ErrorType>(fn: Func<DataType, ErrorType>): Controller<DataType, ErrorType> {
  const ctrl: Controller<DataType, ErrorType> = function ctrl(req, res, next) {
    const instance = {
      req,
      res,
      next
    };
    fn.apply(instance, req.data);
  };
  return ctrl;
}

export default explodeData;