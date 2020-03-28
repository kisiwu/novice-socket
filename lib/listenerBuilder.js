const { flatten } = require("array-flatten");
const toArray = require("./utils/toArray");
const createReplier = require('./rep/createReplier');

/**
 * ListenerBuilder class
 *
 * @constructor
 * @param {(string|object)} settings Event name or settings
 * @param {string} settings.name Event name
 * @param {string} [settings.description]
 * @param {string} [settings.tags]
 * @param {...Function} handlers
 */
function ListenerBuilder(settings, handlers) {
  this.name;
  this.description;
  this.tags = [];
  this.handlers = toArray(
    flatten(Array.prototype.slice.call(arguments, 1)),
    "function"
  );

  if (settings) {
    var eventName;
    if (typeof settings === "object") {
      eventName = settings.name;
      if (typeof settings.description === 'string' ) {
        this.description = settings.description;
      }
      if (settings.tags) {
        this.tags = toArray(settings.tags, 'string');
      }
    } else {
      eventName = settings;
    }
    if (eventName && typeof eventName === "string") {
      this.name = eventName;
    }
  }

  if (!this.name) {
    throw new Error(`ListenerBuilder constructor: Missing 'name' property`);
  }

  if(!this.handlers.length) {
    throw new TypeError(`ListenerBuilder constructor: requires a function`);
  }
}

/**
 * @todo 3rd param as onError callback
 */
ListenerBuilder.prototype.handle = function(req, emit) {
  var nexts = [];
  this.handlers
    .map(v => v)
    .reverse()
    .forEach(handle => {
      var next = () => {};
      if (nexts.length) {
        next = nexts[nexts.length - 1];
      }
      nexts.push(err => {
        if (err) {
          // @todo do something
          return;
        }
        return handle(req, emit, next);
      });
    });

  if (nexts.length) {
    var n = nexts[nexts.length - 1];
    nexts = undefined;
    n();
  }
};

ListenerBuilder.prototype.register = function(socket, nsp, io) {
  var instance = this;
  // .on
  socket.on(instance.name, function() {
    var args = Array.prototype.slice.call(arguments);

    var req = {
      data: args, 
      event: instance.toJson(),
      nsp: nsp,
      socket: socket,
      handshake: socket.handshake
    };
    // @todo: send 3rd param as onError callback
    instance.handle(req, createReplier(socket, nsp, io));
  });
};

ListenerBuilder.prototype.toJson = function() {
  var v = {
    name: this.name
  };
  if (this.description) {
    v.description = this.description;
  }
  v.tags = toArray(this.tags, 'string');
  return v;
}

module.exports = ListenerBuilder;
