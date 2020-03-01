function explodeData(fn) {
  var ctrl = function(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    fn.apply(this, req.data);
  };
  return ctrl;
};

module.exports = explodeData;