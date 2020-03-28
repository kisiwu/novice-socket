const { flatten } = require('array-flatten');
const ListenerBuilder = require('./listenerBuilder');

function isNspBuilder(router) {
  return router 
    && router.namespace 
    && Array.isArray(router.events)
    && Array.isArray(router.stack)
    && typeof router.add === 'function'
    && typeof router.link === 'function'
    && typeof router.registerEvents === 'function'
    && router._id;
}

function isListenerBuilder(evnt) {
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
 * @param {string} [namespace]
 */
function NspBuilder(namespace) {
  this._id = Date.now() + '_' + ((Math.random() * 1000000) + 1000001)
  this.namespace = '/';
  this.middlewares = [];
  this.events = [];
  this.stack = [];

  if(namespace){
    if (typeof namespace !== 'string') {
      throw new TypeError(
        `'NspBuilder' first argument should be a string`
      );
    }
    if(!namespace.startsWith('/')) {
      throw new SyntaxError(
        `'NspBuilder' first argument should be a string starting with '/'`
      );
    }
    this.namespace = namespace;
  }
}

NspBuilder.prototype.add = function () {
  var args = flatten(Array.prototype.slice.call(arguments, 0));

  // redirect if some arguments are Namespaces
  if(args.some(arg => isNspBuilder(arg))){
    return this.link.apply(this, args);
  }

  // create ListenerBuilder if first arg is not a ListenerBuilder
  if (args[0] && (typeof args[0] === 'string' || (typeof args[0] != 'function' && args[0].name && !isListenerBuilder(args[0])))) {
    args = [new ListenerBuilder(args[0], args.slice(1))];
  }

  // check if args are valid
  if(args.some(arg => !isListenerBuilder(arg))){
    // redirect if middlewares
    if (!args.some(arg => typeof arg !== 'function')) {
      return this.use.call(this, args);
    }
    throw new TypeError(`NspBuilder.add() requires a ListenerBuilder`);
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

NspBuilder.prototype.use = function (fn) {
  var callbacks = flatten(Array.prototype.slice.call(arguments, 0));

  if (callbacks.length === 0) {
    throw new TypeError('NspBuilder.use() requires a function')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    if (typeof fn !== 'function') {
      throw new TypeError('NspBuilder.use() requires a function but got a ' + (typeof fn))
    }

    this.middlewares.push(fn);
  }

  return this;
}

NspBuilder.prototype.link = function (fn) {
  var offset = 0;
  var namespace = '/';

  // default namespace to '/'
  // disambiguate NspBuilder.link([fn])
  if (typeof fn === 'string') {
    var arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the namespace
    if (typeof arg === 'string') {
      offset = 1;
      namespace = fn;
    }
  }

  var callbacks = flatten(Array.prototype.slice.call(arguments, offset));

  if (callbacks.length === 0) {
    throw new TypeError('NspBuilder.link() requires a NspBuilder')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    if (!isNspBuilder(fn)) {
      throw new TypeError('NspBuilder.link() requires a NspBuilder but got a ' + (typeof fn))
    }

    if (fn._id === this._id) {
      throw new ReferenceError('NspBuilder.link() shouldn\'t receive itself')
    }

    if (!offset) {
      this.stack.push(fn);
    }
  }

  if(offset) {
    var router = new NspBuilder(namespace);
    this.stack.push(router.link(callbacks));
  }

  return this;
}

NspBuilder.prototype.registerEvents = function (namespace, socket, nsp, io) {
  if (namespace == this.namespace) {

    this.middlewares.forEach(
      middleware => {
        nsp.use(middleware);
      }
    );

    this.events.forEach(event => {
      event.register(socket, nsp, io);
    });
  }

  if(this.stack.length && namespace.startsWith(this.namespace)) {
    var subpath = namespace.substring(this.namespace.length);
    if(!subpath.startsWith('/')) {
      subpath = '/' + subpath;
    }
    this.stack.forEach(
      router => router.registerEvents(subpath, socket, nsp, io)
    );
  }
}

NspBuilder.prototype.getPaths = function(namespace) {
  var v = [];
  var insertCurrentPath = false;

  if (!namespace) {
    namespace = this.namespace;
    insertCurrentPath = true;
  } else if(namespace === '/') {
    if (this.namespace !== '/') {
      namespace = this.namespace;
      insertCurrentPath = true;
    }
  } else {
    if (this.namespace !== '/') {
      namespace = (`${namespace}${this.namespace}`);
      insertCurrentPath = true;
    }
  }

  if (insertCurrentPath) {
    v.push(namespace);
  }

  this.stack.forEach(
    router => {
      flatten(router.getPaths(namespace)).forEach(
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

NspBuilder.prototype.getEvents = function(namespace) {
  var v = {};

  if (!namespace || namespace === '/') {
    namespace = this.namespace;
  } else {
    if (this.namespace !== '/') {
      namespace = (`${namespace}${this.namespace}`);
    }
  }

  v[namespace] = this.events.map(ev => ev.toJson());

  this.stack.forEach(
    router => {
      var sub = router.getEvents(namespace);
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

module.exports = NspBuilder;