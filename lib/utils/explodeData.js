function explodeData(fn) {
  return function ctrl(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    fn.apply(this, req.data);
  };
};

module.exports = explodeData;