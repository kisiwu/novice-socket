const { flatten } = require('array-flatten');
const SocketEvent = require('./event');

function isNamespace(router) {
  return router 
    && router.path 
    && Array.isArray(router.events)
    && Array.isArray(router.stack)
    && typeof router.add === 'function'
    && typeof router.link === 'function'
    && typeof router.registerEvents === 'function'
    && router._id;
}

function isEvent(evnt) {
  return evnt 
    && evnt.name 
    // && Array.isArray(evnt.handlers)
    && typeof evnt.toJson === 'function'
    && typeof evnt.register === 'function'
}

/**
 * SocketEvents class
 *
 * @constructor
 * @param {string} [path]
 */
function SocketNamespace(path) {
  this._id = Date.now() + '_' + ((Math.random() * 1000000) + 1000001)
  this.path = '/';
  this.middlewares = [];
  this.events = [];
  this.stack = [];

  if(path){
    if (typeof path !== 'string') {
      throw new TypeError(
        `'SocketNamespace' first argument should be a string`
      );
    }
    if(!path.startsWith('/')) {
      throw new SyntaxError(
        `'SocketNamespace' first argument should be a string starting with '/'`
      );
    }
    this.path = path;
  }
}

SocketNamespace.prototype.add = function () {
  var args = flatten(Array.prototype.slice.call(arguments, 0));
  // create SocketEvent if first arg is not a SocketEvent
  if (args[0] && (typeof args[0] === 'string' || (args[0].name && !isEvent(args[0])))) {
    args = [new SocketEvent(args[0], args.slice(1))];
  }

  // check if args are valid
  if(args.some(arg => !isEvent(arg))){
    // if middlewares
    if (!args.some(arg => typeof arg !== 'function')) {
      return this.use.call(this, args);
    }
    throw new TypeError(`SocketNamespace.add() requires a SocketEvent`);
  }

  var newEvents = this.events.concat(args);

  // remove duplicate events (by name)
  newEvents = newEvents
    .map( ev => ev)
    .reverse();

  newEvents = newEvents.filter((a, idx) => {
      return newEvents.findIndex((
        b => b.name === a.name
      )) == idx
    })
    .sort((a, b) => {
      var sort = 0;
      if (a.name > b.name) {
        sort = 1
      } else if (a.name < b.name) {
        sort = -1;
      }
      return sort;
    });

  this.events = newEvents;
  return this;
}

SocketNamespace.prototype.use = function (fn) {
  var callbacks = flatten(Array.prototype.slice.call(arguments, 0));

  if (callbacks.length === 0) {
    throw new TypeError('SocketNamespace.use() requires a function')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    if (typeof fn !== 'function') {
      throw new TypeError('SocketNamespace.use() requires a function but got a ' + (typeof fn))
    }

    this.middlewares.push(fn);
  }

  return this;
}

SocketNamespace.prototype.link = function (fn) {
  var offset = 0;
  var path = '/';

  // default path to '/'
  // disambiguate router.link([fn])
  if (typeof fn === 'string') {
    var arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the path
    if (typeof arg === 'string') {
      offset = 1;
      path = fn;
    }
  }

  var callbacks = flatten(Array.prototype.slice.call(arguments, offset));

  if (callbacks.length === 0) {
    throw new TypeError('SocketNamespace.link() requires a SocketNamespace')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    if (!isNamespace(fn)) {
      throw new TypeError('SocketNamespace.link() requires a SocketNamespace but got a ' + (typeof fn))
    }

    if (fn._id === this._id) {
      throw new ReferenceError('SocketNamespace.link() shouldn\'t receive itself')
    }

    if (!offset) {
      this.stack.push(fn);
    }
  }

  if(offset) {
    var router = new SocketNamespace(path);
    this.stack.push(router.link(callbacks));
  }

  return this;
}

SocketNamespace.prototype.registerEvents = function (path, socket, nsp, io) {
  if (path == this.path) {

    this.middlewares.forEach(
      middleware => {
        nsp.use(middleware);
      }
    );

    this.events.forEach(event => {
      event.register(socket, nsp, io);
    });
  }

  if(this.stack.length && path.startsWith(this.path)) {
    var subpath = path.substring(this.path.length);
    if(!subpath.startsWith('/')) {
      subpath = '/' + subpath;
    }
    this.stack.forEach(
      router => router.registerEvents(subpath, socket, nsp, io)
    );
  }
}

SocketNamespace.prototype.getPaths = function(path) {
  var v = [];
  var insertCurrentPath = false;

  if (!path) {
    path = this.path;
    insertCurrentPath = true;
  } else if(path === '/') {
    if (this.path !== '/') {
      path = this.path;
      insertCurrentPath = true;
    }
  } else {
    if (this.path !== '/') {
      path = (`${path}${this.path}`);
      insertCurrentPath = true;
    }
  }

  if (insertCurrentPath) {
    v.push(path);
  }

  this.stack.forEach(
    router => {
      flatten(router.getPaths(path)).forEach(
        p => {
          if (v.indexOf(p) == -1) {
            v.push(p);
          }
        }
      )
    }
  );

  return v;
}

SocketNamespace.prototype.getEvents = function(path) {
  var v = {};

  if (!path || path === '/') {
    path = this.path;
  } else {
    if (this.path !== '/') {
      path = (`${path}${this.path}`);
    }
  }

  v[path] = this.events.map(ev => ev.toJson());

  this.stack.forEach(
    router => {
      var sub = router.getEvents(path);
      Object.keys(sub).forEach(
        k => {
          if(sub[k].length) {
            if(v[k]) {
              v[k].push.apply(v[k], sub[k])
            } else {
              v[k] = sub[k];
            }
          }
        }
      );
    }
  );

  return v;
}

module.exports = SocketNamespace;