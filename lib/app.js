const socketIO = require('socket.io');
const { flatten } = require('array-flatten');
const NspBuilder = require('./nspBuilder');
const toArray = require('./utils/toArray');

function slice(args, n) {
  return Array.prototype.slice.call(args, n || 0);
}

/**
 * 
 * @param {string[]|string} [namespaces] Limits application to one or more namespaces.
 */
function SocketApp(namespaces) {
  if (!(this instanceof SocketApp)) {
    return new SocketApp(namespaces);
  }

  /**
   * @namespace
   * @property  {Function[]} _onConnectionFn
   * @property  {Function[]} _onDisconnectFn
   * @property  {string[]} _namespaces
   * @property  {NspBuilder} [_router]
   * @property  {any} [_io]
   */
  var sa = this;
  sa._onConnectionFn = [];
  sa._onDisconnectFn = [];
  sa._namespaces = toArray(namespaces, "string");
  sa._router;
  sa._io;

  var app = function() {
    return app.link.apply(app, slice(arguments));
  };

  Object.defineProperty(app, "events", {
    configurable: false,
    enumerable: true,
    get: () => {
      return sa.getEvents();
    }
  });

  Object.defineProperty(app, "namespaces", {
    configurable: false,
    enumerable: true,
    get: () => {
      return sa.getPaths();
    }
  });

  Object.defineProperty(app, "activeNamespaces", {
    configurable: false,
    enumerable: true,
    get: () => {
      return sa.getNamespaces();
    }
  });

  Object.defineProperty(app, "currentNamespaces", {
    configurable: false,
    enumerable: true,
    get: () => {
      return sa.getNamespaces();
    }
  });

  app.getNamespace = sa.getNamespace.bind(sa);

  [
    'addOnConnection',
    'addOnDisconnect',
    'onConnection',
    'onDisconnect',
    'add',
    'use',
    'link',
    'build',
    'destroy',
    'close',
    'adapter',
    'origins'
  ].forEach(
    method => {
      // do not bind as it will return SocketApp instance
      // app[method] = sa[method].bind(sa);
      app[method] = function () {
        SocketApp.prototype[method].apply(sa, slice(arguments));
        return app;
      }
    }
  );

  return app;
}

SocketApp.prototype.routing = function() {
  if (!this._router) {
    this._router = new NspBuilder();
  }
  return this;
};

SocketApp.prototype.add = function() {
  this.routing()
    ._router
    .add
    .apply(this._router, slice(arguments));
  return this;
};

SocketApp.prototype.use = function() {
  this.routing()
    ._router
    .use
    .apply(this._router, slice(arguments));
  return this;
};

SocketApp.prototype.link = function() {
  if(this._io) {
    throw new Error('SocketApp.link() cannot be called after SocketApp.build()')
  }
  this.routing()
    ._router
    .link
    .apply(this._router, slice(arguments));
  return this;
};

SocketApp.prototype.getPaths = function() {
  var r = [];
  if (!this._router) {
    return r;
  }
  r = this._router.getPaths();
  if (this._namespaces.length) {
    r = r.filter(p => this._namespaces.indexOf(p) > -1);
  }
  return r;
};

SocketApp.prototype.getEvents = function() {
  var r = {};
  if (!this._router) {
    return r;
  }
  r = this._router.getEvents();
  if (this._namespaces.length) {
    Object.keys(r).filter(k => {
      if(this._namespaces.indexOf(k) == -1) {
        delete r[k];
      }
    });
  }
  return r;
};

SocketApp.prototype.onConnection = function() {
  var args = toArray(flatten(slice(arguments)), 'function');
  if (!args.length) {
    throw new TypeError('SocketApp.onConnection() requires a function')
  }
  this._onConnectionFn = [];
  this._onConnectionFn.push.apply(this._onConnectionFn, args);
  return this;
};

SocketApp.prototype.onDisconnect = function() {
  var args = toArray(flatten(slice(arguments)), 'function');
  if (!args.length) {
    throw new TypeError('SocketApp.onDisconnect() requires a function')
  }
  this._onDisconnectFn = [];
  this._onDisconnectFn.push.apply(this._onDisconnectFn, args);
  return this;
};

SocketApp.prototype.addOnConnection = function() {
  var args = toArray(flatten(slice(arguments)), 'function');
  if (!args.length) {
    throw new TypeError('SocketApp.addOnConnection() requires a function')
  }
  this._onConnectionFn.push.apply(this._onConnectionFn, args);
  return this;
};

SocketApp.prototype.addOnDisconnect = function() {
  var args = toArray(flatten(slice(arguments)), 'function');
  if (!args.length) {
    throw new TypeError('SocketApp.addOnDisconnect() requires a function')
  }
  this._onDisconnectFn.push.apply(this._onDisconnectFn, args);
  return this;
};

SocketApp.prototype.origins = function() {
  if (this._io) {
    var args = slice(arguments);
    this._io.origins.apply(this._io, args);
  }
  return this;
}

SocketApp.prototype.adapter = function() {
  if (this._io) {
    var args = slice(arguments);
    this._io.adapter.apply(this._io, args);
  }
  return this;
}

SocketApp.prototype.close = function(fn) {
  if (this._io) {
    this._io.close(fn);
  }
  return this;
}

SocketApp.prototype.getNamespace = function(name) {
  var nsp;
  if (this._io) {
    nsp = this._io.nsps[(name || '/')];
  }
  return nsp;
}

SocketApp.prototype.getNamespaces = function() {
  var nsps = [];
  if (this._io) {
    nsps = Object.keys(this._io.nsps);
  }
  return nsps;
}

/**
 * @todo: register namespace events (see reserved events)
 */
SocketApp.prototype.build = function(http, opts) {
  var app = this;
  this.destroy();

  if(!app._io){
    app._io = socketIO(http, opts);
  }

  app.routing().getPaths().forEach(
    namespace => {
      const nsp = app._io.of(namespace);

      // register nsp middlewares
      app._router.registerMiddlewares(
        namespace,
        nsp, 
        app._io
      );

      // connection event
      nsp.on('connection', function(socket){
        socket.handshake.user = socket.handshake.user || {};

        app._onConnectionFn.forEach(
          fn => fn(socket, nsp, app._io)
        );

        // disconnect event
        socket.on('disconnect', function(reason){
          app._onDisconnectFn.forEach(
            fn => fn(reason, socket, nsp, app._io)
          );
        });

        // register events
        app._router.registerEvents(
          namespace, 
          socket, 
          nsp, 
          app._io
        );
      });
    }
  );
  
  return this;
}

SocketApp.prototype.destroy = function() {
  var app = this;
  if(app._io && app._io.nsps){
    // for each namespace
    Object.keys(app._io.nsps).forEach(
      k => {
        const nsp = app._io.nsps[k];
        const connectedSockets = Object.keys(nsp.connected);
        // disconnect sockets
        connectedSockets.forEach(socketId => {
          nsp.connected[socketId].disconnect();
        });
        // remove listeners
        nsp.removeAllListeners();
        // remove from the server namespaces
        delete app._io.nsps[k];
      }
    );
  }
  return this;
}

module.exports = SocketApp;