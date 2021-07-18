import { Controller } from '../definitions';

function explodeData(fn: (...args: unknown[]) => void): Controller {
  return function ctrl(req, res, next) {
    const instance = {
      req,
      res,
      next
    };
    fn.apply(instance, req.data);
  };
}

export default explodeData;