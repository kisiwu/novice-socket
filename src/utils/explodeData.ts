import { Controller, Request, Replier, NextFunc } from '../definitions';

type Func<T> = (this: {
  req: Request,
  res: Replier,
  next: NextFunc
}, ...args: T[]) => void;

function explodeData<T>(fn: Func<T>): Controller<T> {
  const ctrl: Controller<T> = function ctrl(req, res, next) {
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