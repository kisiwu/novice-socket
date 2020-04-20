function explodeData(fn) {
  return function ctrl(req, res, next) {
    var instance = {};
    instance.req = req;
    instance.res = res;
    instance.next = next;
    fn.apply(instance, req.data);
  };
};

module.exports = explodeData;