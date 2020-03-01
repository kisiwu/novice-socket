// const reservedEvents = require('../reservedEvents');
const toArray = require('../utils/toArray');


/**
 * 
 * @param {*} nsp 
 * @param {*} io 
 * @param {string[]} nspsArgs 
 */
function createSocketReplier(socket, nsp, io) {

  /**
   * @param {[any]} data 
   */
  function emit(data){
    socket.emit.apply(socket, data);
  }

  var replier = function (event) {
    if (typeof event === "function") {
      return event(socket, nsp, io);
    }
    emit(Array.prototype.slice.call(arguments, 0));
  };

  defineModifiers('socket', replier, (prop, v) => {
    switch(prop) {
      case 'compress':
      case 'binary':
      case 'in':
      case 'to':
        socket[prop](v);
        break;
      default:
        socket[prop];
        break;
    }
  });

  replier.of = function() {
    return createNamespaceReplier(socket, nsp, io, Array.prototype.slice.call(arguments, 0));
  };
  replier.emit = replier;

  return replier;
}

/**
 * 
 * @param {*} nsp 
 * @param {*} io 
 * @param {string[]} nspsArgs 
 */
function createNamespaceReplier(socket, nsp, io, nspsArgs) {
  var nsps;
  nspsArgs = toArray(nspsArgs, 'string');
  if(nspsArgs.length) {
    nsps = nspsArgs.map(p => io.nsps[p]).filter(v => v);
  } else {
    nsps = [nsp];
  }

  /**
   * @param {[any]} data 
   */
  function emit(data){
    nsps.forEach(
      n => {
        n.emit.apply(n, data);
      }
    );
  }

  var replier = function (event) {
    if (typeof event === "function") {
      return event(socket, nsp, io);
    }
    emit(Array.prototype.slice.call(arguments, 0));
  };

  defineModifiers('namespace', replier, (prop, v) => {
    switch(prop) {
      case 'binary':
      case 'in':
      case 'to':
        nsps.forEach(
          n => {
            n[prop](v);
          }
        );
        break;
      default:
        nsps.forEach(
          n => {
            n[prop];
          }
        );
        break;
    }
  });

  replier.emit = replier;

  return replier;
}

function defineModifiers(type, replier, cb) {
  Object.defineProperties(replier, {
    binary: {
      configurable: false,
      enumerable: true,
      get: () => {
        cb('binary', true);
        return replier;
      }
    },
    notBinary: {
      configurable: false,
      enumerable: true,
      get: () => {
        cb('binary', false);
        return replier;
      }
    },
    volatile: {
      configurable: false,
      enumerable: true,
      get: () => {
        cb('volatile');
        return replier;
      }
    }
  });

  if (type == 'socket') {
    Object.defineProperties(replier, {
      broadcast: {
        configurable: false,
        enumerable: true,
        get: () => {
          cb('broadcast');
          return socketReplier;
        }
      },
      compressed: {
        configurable: false,
        enumerable: true,
        get: () => {
          cb('compress', true);
          return replier;
        }
      },
      notCompressed: {
        configurable: false,
        enumerable: true,
        get: () => {
          cb('compress', false);
          return replier;
        }
      }
    });
  } 
  else if (type == 'namespace') {
    Object.defineProperties(replier, {
      local: {
        configurable: false,
        enumerable: true,
        get: () => {
          cb('local');
          return socketReplier;
        }
      }
    });
  }

  replier.in = room => {
    cb('in', room);
  };
  replier.to = room => {
    cb('to', room);
  };
}


module.exports = function createReplier(socket, nsp, io) {
  /*
  var socketReplier = (event, data, dest) => {
    if (typeof event === "function") {
      return event(socket, nsp, io);
    }

    // check name (reserved names)
    if(reservedEvents.indexOf(event) > -1) {
      return;
    }

    if (dest == "broadcast") {
      socket.broadcast.emit(event, data);
      return;
    }

    if (dest == "volatile") {
      socket.volatile.emit(event, data);
      return;
    }

    if (dest == "binary") {
      socket.binary(true).emit(event, data);
      return;
    }

    if (dest == "all") {
      nsp.emit(event, data);
      // socket.broadcast.emit(event, data);
      // socket.emit(event, data);
      return;
    }

    if (dest == "self" && socket.room) {
      socket.emit(event, data);
      return;
    }

    if (dest == "in" && socket.room) {
      nsp.in(socket.room).emit(event, data);
      return;
    }

    if (dest == "to" && socket.room) {
      socket.to(socket.room).emit(event, data);
      return;
    }

    // @todo: [custom] emit aimed at other sockets
  };
  */

  return createSocketReplier(socket, nsp, io);
};
