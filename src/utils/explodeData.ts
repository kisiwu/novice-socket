import { Controller, Request, Replier, NextFunc } from '../definitions';

type Func<T, E> = (this: {
  req: Request<T>,
  res: Replier,
  next: NextFunc<E>
}, ...args: T[]) => void;

function explodeData<T, E>(fn: Func<T, E>): Controller<T, E> {
  const ctrl: Controller<T, E> = function ctrl(req, res, next) {
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