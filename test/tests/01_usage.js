const kaukau = require("kaukau");
const Logger = kaukau.Logger;

const http = require('http');
const socketlib = require('../../lib/index');
const { NspBuilder, utils } = socketlib;
const { explodeData, errorHandler } = utils;


describe("Usage", () => {
  var nsp, socketapp, server;
  it("should create namespace '/main' and add events", function() {
    nsp = NspBuilder('/main')
      // middlewares
      .use((socket, next) => {
        if (socket.request.headers.cookie) {
          return next();
        }
        next(new Error('Authentication error'));
      })
      // socket server events
      .add('error', explodeData(function(error){
      }))
      .add('disconnecting', explodeData(function(reason){
      }))
      // custom events
      .add('turn off', (req, res) => {
        res.of().emit('turned off', req.data[0]);
      })
      .add({name: 'turn on', description: 'does something'}, errorHandler(explodeData(function(msg){
        if(!(typeof msg === 'string' && msg.length > 2)) {
          throw TypeError('The message must be a string of min 3 chars');
        }
        this.next();
      })),
      errorHandler(explodeData(function(msg){
        this.res
          .of(this.req.nsp.name) // same as .of()
          .volatile
          .emit('turned on', msg);
      })));

    expect(nsp.namespace)
      .to.be.a('string', 'nsp.namespace is not a string')
      .to.equal('/main');

    expect(nsp.middlewares)
      .to.be.an('array', 'nsp.middlewares is not an array')
      .to.have.lengthOf(1);

    expect(nsp.events)
      .to.be.an('array', 'nsp.events is not an array')
      .to.have.lengthOf(4);
    
    expect(nsp.registerEvents)
      .to.be.a('function', 'nsp.registerEvents is not a function');
  });

 
  it("should create app limited to namespace '/main'", function() {
    socketapp = socketlib(['/main'])
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
      })
      .onDisconnect((reason, socket, nsp) => {
      });

      [
        'adapter',
        'origins',
        'close',
        'build',
        'destroy',
        'link',
        'getNamespace'
      ].forEach( method => {
        expect(socketapp[method])
          .to.be.a('function', `socketapp.${method} is not a function`);
      });

      expect(socketapp.events)
          .to.be.an('object', `socketapp.events is not an object`)
          .that.is.empty;
      
      expect(socketapp.namespaces)
          .to.be.an('array', 'socketapp.namespaces is not an array')
          .that.is.empty;
        
      expect(socketapp.currentNamespaces)
          .to.be.an('array', 'socketapp.currentNamespaces is not an array')
          .that.is.empty;
  });

  it("should link namespace '/main' into app", function() {
    socketapp.link('/', nsp);

    expect(socketapp.events)
          .to.be.an('object', `socketapp.events is not an object`)
          .that.has.property('/main')
          .that.is.an('array')
          .that.has.lengthOf(4);
      
    expect(socketapp.namespaces)
        .to.be.an('array', 'socketapp.namespaces is not an array')
        .to.eql(['/main']);
      
    expect(socketapp.currentNamespaces)
        .to.be.an('array', 'socketapp.currentNamespaces is not an array')
        .that.is.empty;
  });

  it("should link namespace '/main' into app ('add' method)", function() {
    socketapp.add('/', NspBuilder('/main').add('nothing', ()=>{}));

    expect(socketapp.events)
          .to.be.an('object', `socketapp.events is not an object`)
          .that.has.property('/main')
          .that.is.an('array')
          .that.has.lengthOf(5);
      
    expect(socketapp.namespaces)
        .to.be.an('array', 'socketapp.namespaces is not an array')
        .to.eql(['/main']);
      
    expect(socketapp.currentNamespaces)
        .to.be.an('array', 'socketapp.currentNamespaces is not an array')
        .that.is.empty;
  });

  it("should build app (clients can connect)", function() {
    server = http.createServer();
    var options = {};
    socketapp.build(server, options);

    expect(socketapp.events)
          .to.be.an('object', `socketapp.events is not an object`)
          .that.has.property('/main')
          .that.is.an('array')
          .that.has.lengthOf(5);

    expect(socketapp.namespaces)
        .to.be.an('array', 'socketapp.namespaces is not an array')
        .to.eql(['/main']);
      
    expect(socketapp.currentNamespaces)
        .to.be.an('array', 'socketapp.currentNamespaces is not an array')
        .to.eql(['/', '/main']);
  });

  it("should destroy app (disconnects all clients)", function() {
    socketapp.destroy();

    expect(socketapp.currentNamespaces)
        .to.be.an('array', 'socketapp.currentNamespaces is not an array')
        .that.is.empty;
  });

  it("should build and destroy app again", function() {
    socketapp.build();

    expect(socketapp.currentNamespaces)
        .to.be.an('array', 'socketapp.currentNamespaces is not an array')
        .to.eql(['/main']);

    socketapp.destroy();

    expect(socketapp.currentNamespaces)
        .to.be.an('array', 'socketapp.currentNamespaces is not an array')
        .that.is.empty;
  });
});