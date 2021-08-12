# @novice1/socket

A way of building server side [socket.io](https://www.npmjs.com/package/socket.io) applications.

## Installation

```bash
$ npm install @novice1/socket
```

## How to use

### Basically

```js
const { NspBuilder, createServerApp } = require('@novice1/socket');
const http = require('http').createServer();

// create namespace and add events to it
let defaultNamespace = new NspBuilder() 
  .add('chat message', function(req, res, next) {
    let msg = req.data[0];
    console.log('message: ' + msg);
    res.of().emit('chat message', msg);
  })
  .add('disconnecting', function(req, res, next) {
    console.log('user disconnecting');
  });

// create application
let socketApp = createServerApp()
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
  .link(defaultNamespace); // link namespace to the application

// build the application
socketApp.build(http); 

// start server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

### Namespaces

#### Settings

When setting a namespace you can define the name otherwise it will be '/' by default

```js
const { NspBuilder } = require('@novice1/socket');

let defaultNamespace = new NspBuilder(); // same as new NspBuilder('/')

let appNamespace = new NspBuilder('/app');
```

#### Add events

You can add an event listener to a namespace with the method 'add'. It uses the method chaining pattern.
The first argument is the event's name. The other arguments must be the functions to execute. Multiple functions can be executed.
Each function receives three parameters:
- the [request context](#####requestcontext)
- a [response object](#####responseobject)
- a callback to optionally defer execution to the next function

```js
const { NspBuilder } = require('@novice1/socket');

let appNamespace = new NspBuilder('/app')
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
- **event** : the event's details (*name, description, tags*)
- **nsp** : [Namespace](https://socket.io/docs/v4/server-api/#Namespace)
- **socket** : [Socket](https://socket.io/docs/v4/server-api/#Socket)
- **handshake** : [*Socket.handshake*](https://socket.io/docs/v4/server-api/#socket-handshake)


##### <a id="responseobject"></a> response object

Can be used to emit an event from a socket, a room or a namespace

Example

```js
const { NspBuilder } = require('@novice1/socket');

new NspBuilder('/app')
  .add('respond from socket', function one(req, res, next) {
    let msg = req.data[0];

    // examples from socket and room
    res.emit('chat message', msg);
    res.volatile.emit('chat message', msg);
    res.broadcast.emit('chat message', msg);
    res.compressed.emit('chat message', msg);
    res.notCompressed.emit('chat message', msg);
    res.in('room1').emit('chat message', msg);
    res.to('room1').emit('chat message', msg);
  })
  .add('respond from namespace', function(req, res) {
    let msg = req.data[0];

    // examples from namespaces and room
    res.of().emit('chat message', msg); // from current namespace
    res.of('/chat').emit('chat message', msg); // from '/chat' namespace
    res.of().volatile.emit('chat message', msg);
    res.of().local.emit('chat message', msg);
    res.of().in('room1').emit('chat message', msg);
    res.of().to('room1').emit('chat message', msg);
  });
```

#### Add events with ListenerBuilder

The advantage with ListenerBuilder is that you can define the callback (ErrorController) to be called when you execute the "next" callback with an argument that evaluates to `true`. 

Example

```js
const { NspBuilder, ListenerBuilder } = require('@novice1/socket');

let listenerBuilder = new ListenerBuilder(
    'eventName',
    (req, res, next) => {
      if (req.data[0]) {
        // not ok, call ErrorController
        next(new Error('missing message'));
      } else {
        // ok, defer
        next();
      }
    },
    (req, res) => {
      // done
    }
  ).setErrorController((err, req, res) => {
    // not ok, do something
  });

new NspBuilder('/app')
  .add(listenerBuilder);
```


#### Register a middleware to a namespace

Example

```js
const { NspBuilder } = require('@novice1/socket');

new NspBuilder() 
  .use((socket, next) => {
    if (socket.request.headers.cookie) {
      return next();
    }
    next(new Error('Authentication error'));
  })
```

See [namespace.use(fn)](https://socket.io/docs/v4/server-api/#namespace-use-fn)

#### Register a middleware to sockets

Register a middleware to all sockets of a namespace.

Example

```js
const { NspBuilder } = require('@novice1/socket');

new NspBuilder() 
  .add((socket, packet, next) => {
    if (packet.doge === true) return next();
    next(new Error('Not a doge error'));
  })
```

See [socket.use(fn)](https://socket.io/docs/v4/server-api/#socket-use-fn)

#### Link namespaces

A namespace can be linked to another namespace. That way the name of the one being linked will be the concatenation of the namespace linking it and its own. The first argument can also be another string to use in the concatenation.

Example

```js
const { NspBuilder, createServerApp } = require('@novice1/socket');
const http = require('http').createServer();

let main = new NspBuilder('/main');

let app = new NspBuilder('/app');

main.link('/v1', app);

createServerApp()
  .link(main) // same as link('/', main)
  .build(http)
// the namespaces created will be '/main' and '/main/v1/app'

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

### Application

#### Settings

When setting the application, you link the namespaces that will be used to build the `socket.io` server.
You can also limit the namespaces used to build the server.

Example

```js
const { NspBuilder, createServerApp } = require('@novice1/socket');

let appNsp = new NspBuilder('/app');
let otherNsp = new NspBuilder();

createServerApp()
  .link(appNsp)
  .link('/other', otherNsp);
// the namespaces created will be '/app' and '/other'

createServerApp(['/main']) // limit to '/main'
  .link(appNsp)
  .link('/other', otherNsp); // useless
// the namespaces created will be '/main'
```

#### Build

It will build the `socket.io` server from a `http` server.
The settings (namespaces, etc ...) need to be set before the build.

```js
const { NspBuilder, createServerApp } = require('@novice1/socket');
const http = require('http').createServer();

let appNsp = new NspBuilder('/app');

createServerApp()
  .link(app)
  .build(http); // build socket.io server

http.listen(3000, function(){
  console.log('listening on *:3000');
});
```

#### Events

Get a description of events listened by namespaces with the property `events`.

```js
const { createServerApp } = require('@novice1/socket');

let app = createServerApp();

// do something

console.log(app.events['/']);
// displays an array of events listened in the namespace '/'
```

#### Active namespaces

Get an array of the active namespaces (= created on the server) with the property `activeNamespaces`.
You can also get one [namespace](https://socket.io/docs/v4/server-api/#Namespace) with the method `getNamespace`.

```js
const { createServerApp } = require('@novice1/socket');
const http = require('http').createServer();

let app = createServerApp();

// do something

app.build(http);

console.log(app.activeNamespaces);
// displays an array of strings

let nsp = app.getNamespace('/');
// get namespace '/' from socket.io server
```

#### Destroy

You can disconnect all clients and stop handling future connections by executing the method `destroy`.
To rebuild the application you can call the method `build` with no arguments.

```js
const { createServerApp } = require('@novice1/socket');
const http = require('http').createServer();

let app = createServerApp();

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

#### Close

Closes the Socket.IO server and the underlying HTTP server.


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

- [**adapter**](https://socket.io/docs/v4/server-api/#server-adapter-value)
- **add(...fn) : this**
- **add(string, ...fn) : this**
- **add(object, ...fn) : this**
- **add(...NspBuilder) : this** (_alias for "link" method_)
- **add(string, ...NspBuilder) : this** (_alias for "link"method_)
- **build([http.Server|options]) : this**
- **build(port|http.Server[, options]) : this**
- [**close**](https://socket.io/docs/v4/server-api/#server-close-callback)
- **destroy() : this**
- **getNamespace(string) : [Namespace](https://socket.io/docs/v4/server-api/#Namespace)**
- **link(...NspBuilder) : this**
- **link(string, ...NspBuilder) : this**
- **use(...fn) : this**
- **onConnection(..fn) : this**
- **onDisconnect(..fn) : this**


## Utils

### explodeData

```js
const { NspBuilder, utils } = require('@novice1/socket');
const { explodeData } = utils;

let defaultNamespace = new NspBuilder() 
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
const { NspBuilder, utils } = require('@novice1/socket');
const { errorHandler } = utils;

let defaultNamespace = new NspBuilder() 
  .add('chat message', errorHandler(function(req, res) {
    // do something that could throw an error
  }, 'chat error'));
  // a message will be emitted on 'chat error' if an Error is thrown
```

Other examples

```js
const { NspBuilder, utils } = require('@novice1/socket');
const { errorHandler } = utils;

let defaultNamespace = new NspBuilder() 
  .add('chat message', errorHandler(explodeData(function(msg) {
    // do something
  }), 'chat error'));
```


## References

- [Socket.IO](https://socket.io/)