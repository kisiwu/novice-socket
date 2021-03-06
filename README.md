# @novice1/socket

A way of building server side [socket.io](https://www.npmjs.com/package/socket.io) applications.

## Installation

```bash
$ npm install @novice1/socket
```

## How to use

### Basically

```js
const socketlib = require('@novice1/socket');
const http = require('http').createServer();
const { NspBuilder } = socketlib;

var defaultNamespace = NspBuilder() 
  .add('chat message', function(req, res, next) {
    var msg = req.data[0];
    console.log('message: ' + msg);
    res.of().emit('chat message', msg);
  })
  .add('disconnecting', function(req, res, next) {
    console.log('user disconnecting');
  });

var socketApp = socketlib()
  .onConnection((socket, nsp) => {
    // socket.use(fn)
    // socket.join(room[, callback])
    // socket.disconnect(close)

    // Inherited from EventEmitter (along with other methods not mentioned here). 
    // See Node.js documentation for the events module.
    // socket.once(eventName, listener)
    // socket.removeListener(eventName, listener)
    // socket.removeAllListeners([eventName])
    // socket.eventNames()

    console.log('a user connected');
  })
  .onDisconnect((reason, socket, nsp) => {
    console.log('user disconnected');
  })
  .link(defaultNamespace); // link namespace's events to the application

socketApp.build(http); // build the application

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

### Namespaces

#### Settings

When setting a namespace you can define the name otherwise it will be '/' by default

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;

var defaultNamespace = NspBuilder(); // same as NspBuilder('/')

var appNamespace = NspBuilder('/app');
```

#### Add events

You can add an event listener to a namespace with the method 'add'. It uses the method chaining pattern.
The first argument is the event's name. The other arguments must be the functions to execute. Multiple functions can be executed.
Each function receives three parameters:
- the [request context](#####requestcontext)
- a [response object](#####responseobject)
- a callback to optionally defer execution to the next function

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;

var appNamespace = NspBuilder('/app')
  .add('my event', function one(req, res, next) {
    // do something
    next(); // defer execution to the next function ('two')
  }, function two(req, res) {
    // do something
  });

// also
appNamespace.add({
  name: 'event name',
  description: 'short description',
  tags: ['Example']
}, function(req, res) {
  // do something
})
```

##### <a id="requestcontext"></a> request context

It is an object with the following properties:

- **data** : Array of data sent through the event
- **event** : the event's description (*name, etc ...*)
- **nsp** : [namespace](https://socket.io/docs/server-api/#Namespace)
- **socket** : [socket](https://socket.io/docs/server-api/#Socket)
- **handshake** : *socket.handshake*


##### <a id="responseobject"></a> response object

Can be used to emit an event from the socket or from a namespace

Example

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;

NspBuilder('/app')
  .add('respond from socket', function one(req, res, next) {
    var msg = req.data[0];

    // examples
    res.emit('chat message', msg);
    res.binary.emit('chat message', msg);
    res.notBinary.emit('chat message', msg);
    res.notBinary.emit('chat message', msg);
    res.volatile.emit('chat message', msg);
    res.broadcast.emit('chat message', msg);
    res.compressed.emit('chat message', msg);
    res.notCompressed.emit('chat message', msg);
    res.in('room1').emit('chat message', msg);
    res.to('room1').emit('chat message', msg);
  })
  .add('respond from namespace', function(req, res) {
    var msg = req.data[0];

    // examples
    res.of().emit('chat message', msg); // from current namespace
    res.of('/chat').emit('chat message', msg); // from '/chat' namespace
    res.of('/', '/app', '/chat').emit('chat message', msg); // from '/', '/app' and '/chat' namespaces
    res.of().binary.emit('chat message', msg);
    res.of().notBinary.emit('chat message', msg);
    res.of().notBinary.emit('chat message', msg);
    res.of().volatile.emit('chat message', msg);
    res.of().local.emit('chat message', msg);
    res.of().in('room1').emit('chat message', msg);
    res.of().to('room1').emit('chat message', msg);
  });
```

#### Register a middleware to a namespace

Example

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;

NspBuilder() 
  .use((socket, next) => {
    if (socket.request.headers.cookie) {
      return next();
    }
    next(new Error('Authentication error'));
  })
```

See [namespace.use(fn)](https://socket.io/docs/server-api/#namespace-use-fn)

#### Register a middleware to sockets

Register a middleware to all sockets of a namespace.

Example

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;

NspBuilder() 
  .add((socket, packet, next) => {
    if (packet.doge === true) return next();
    next(new Error('Not a doge error'));
  })
```

See [socket.use(fn)](https://socket.io/docs/server-api/#socket-use-fn)

#### Link namespaces

A namespace can be link to another namespace. That way the name of the one being linked will be the concatenation of the namespace linking it and its own. The first argument can also be another string to use in the concatenation.

Example

```js
const socketlib = require('@novice1/socket');
const http = require('http').createServer();
const { NspBuilder } = socketlib;

var main = NspBuilder('/main');

var app = NspBuilder('/app');

main.link('/v1', app);

socketlib()
  .link(main) // same as link('/', main)
  .build(http)
// the namespaces created will be '/main' and '/main/v1/app'

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

### Application

#### Settings

When setting the application you link the namespaces settings that will be used to build the `socket.io` server.
You can also limit the namespaces used to build the server.

Example

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;

var appNsp = NspBuilder('/app');
var otherNsp = NspBuilder();

socketlib()
  .link(appNsp)
  .link('/other', otherNsp);
// the namespaces created will be '/app' and '/other'

socketlib(['/main']) // limit to '/main'
  .link(appNsp)
  .link('/other', otherNsp); // useless
// the namespaces created will be '/main'
```

#### Build

It will build the `socket.io` server from the settings and a `http` server.

```js
const socketlib = require('@novice1/socket');
const { NspBuilder } = socketlib;
const http = require('http').createServer();

var appNsp = NspBuilder('/app');

socketlib()
  .link(app)
  .build(http); // build socket.io server

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

#### Events

Get a description of events listened by namespaces with the property `events`.

```js
const socketlib = require('@novice1/socket');

var app = socketlib();

// do something

console.log(app.events['/']);
// displays an array of events listened in the namespace '/'
```

#### Active namespaces

Get an array of the active namespaces (= created on the server) with the property `activeNamespaces`.
You can also get one [namespace](https://socket.io/docs/server-api/#Namespace) with the method `getNamespace`.

```js
const socketlib = require('@novice1/socket');
const http = require('http').createServer();

var app = socketlib();

// do something

app.build(http);

console.log(app.activeNamespaces);
// displays an array of strings

var nsp = app.getNamespace('/');
// get namespace '/' from socket.io server
```

#### Destroy

You can disconnect all clients and stop handling future connections by executing the method `destroy`.
To rebuild the application you can call the method `build` with no arguments.

```js
const socketlib = require('@novice1/socket');
const http = require('http').createServer();

var app = socketlib();

// do something

app.build(http);

http.listen(3000, function(){
  console.log('listening on *:3000');

  app.destroy();
  // all connections closed and no future connections 

  app.build();
  // connection possible again
});
```

## NspBuilder methods

- **add(...fn) : this**
- **add(string, ...fn) : this**
- **add(object, ...fn) : this**
- **add(...NspBuilder) : this** (_alias for "link"method_)
- **add(string, ...NspBuilder) : this** (_alias for "link"method_)
- **getPaths() : string[]**
- **getEvents() : object**
- **link(...NspBuilder) : this**
- **link(string, ...NspBuilder) : this**
- **use(...fn) : this**

## Application methods

- [**adapter**](https://socket.io/docs/server-api/#server-adapter-value)
- **add(...fn) : this**
- **add(string, ...fn) : this**
- **add(object, ...fn) : this**
- **add(...NspBuilder) : this** (_alias for "link" method_)
- **add(string, ...NspBuilder) : this** (_alias for "link"method_)
- **build([Server]) : this**
- [**close**](https://socket.io/docs/server-api/#server-close-callback)
- **destroy() : this**
- **getNamespace(string) : [Namespace](https://socket.io/docs/server-api/#Namespace)**
- **link(...NspBuilder) : this**
- **link(string, ...NspBuilder) : this**
- **use(...fn) : this**
- **onConnection(..fn) : this**
- **onDisconnect(..fn) : this**
- [**origins**](https://socket.io/docs/server-api/#server-origins-value)


## Utils

### explodeData

```js
const socketlib = require('@novice1/socket');
const { NspBuilder, utils } = socketlib;
const { explodeData } = utils;

var defaultNamespace = NspBuilder() 
  .add('chat message', explodeData(function(msg) {
    // - this.req
    // - this.res
    // - this.next
    console.log('message: ' + msg);
    this.res.of().emit('chat message', msg);
  }));
```

### errorHandler

```js
const socketlib = require('@novice1/socket');
const { NspBuilder, utils } = socketlib;
const { errorHandler } = utils;

var defaultNamespace = NspBuilder() 
  .add('chat message', errorHandler(function(req, res) {
    // do something that could throw an error
  }, 'chat error'));
  // a message will be emitted on 'chat error' if an Error is thrown
```

Other examples

```js
const socketlib = require('@novice1/socket');
const { NspBuilder, utils } = socketlib;
const { errorHandler } = utils;

var defaultNamespace = NspBuilder() 
  .add('chat message', errorHandler(explodeData(function(msg) {
    // do something
  }), 'chat error'));
```


## References

- [Socket.IO](https://socket.io/)