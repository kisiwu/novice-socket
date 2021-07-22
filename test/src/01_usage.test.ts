/* eslint-disable @typescript-eslint/no-unused-vars */
import socketlib, { ServerApp, NspBuilder, utils, ListenerBuilder } from '../../src/index';
import { expect } from 'chai';
import http from 'http';
const { explodeData, errorHandler } = utils;


describe('Usage', () => {
  let nsp: NspBuilder, serverApp: ServerApp, server: http.Server;
  it('should create namespace \'/main\' and add events', function() {
    nsp = new NspBuilder('/main')
      // middlewares
      .use((socket, next) => {
        if (socket.request.headers.cookie) {
          return next();
        }
        next(new Error('Authentication error'));
      })
      // socket server events
      .add('error', explodeData(function(error){
        //
      }))
      .add('disconnecting', explodeData(function(reason: string){
        //
        console.log(reason);
      }))
      // custom events
      .add('turn off', (req, res) => {
        res.of('/').emit('turned off', req.data[0]);
      })
      .add({name: 'turn on', description: 'does something'}, errorHandler(explodeData(function(msg: string | number, other: string | number){
        if(!(typeof msg === 'string' && msg.length > 2)) {
          throw TypeError('The message must be a string of min 3 chars');
        }
        this.next();
      })),
      errorHandler(explodeData(function(msg: string){
        this.res
          .of(this.req.nsp.name) // same as .of()
          .volatile
          .emit('turned on', msg);
      })));

    nsp.add(new ListenerBuilder({ 
      name: 'full', 
      description: 'trying full listener',
      tags: ['Socket API']
    }, errorHandler(explodeData(function(msg: string, other?: string){
      this.res
        .of()
        .volatile
        .emit('full', msg);
    }))).setErrorController((err, req, res) => {
      res('full error', req.data[0], (data: unknown) => {
        console.log('ack:', data)
      });
    }));

    expect(nsp.name)
      .to.be.a('string', 'nsp.name is not a string')
      .to.equal('/main');

    expect(nsp.middlewares)
      .to.be.an('array', 'nsp.middlewares is not an array')
      .to.have.lengthOf(1);

    expect(nsp.events)
      .to.be.an('array', 'nsp.events is not an array')
      .to.have.lengthOf(5);
    
    expect(nsp.registerEvents)
      .to.be.a('function', 'nsp.registerEvents is not a function');
  });

 
  it('should create app limited to namespace \'/main\'', function() {
    serverApp = socketlib(['/main'])
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
        //
      });

      //
      expect(serverApp.getNamespace)
          .to.be.a('function', 'serverApp.getNamespace is not a function');
      //
      expect(serverApp.link)
          .to.be.a('function', 'serverApp.link is not a function');
      //
      expect(serverApp.destroy)
          .to.be.a('function', 'serverApp.destroy is not a function');
      //
      expect(serverApp.build)
          .to.be.a('function', 'serverApp.build is not a function');
      //
      expect(serverApp.close)
          .to.be.a('function', 'serverApp.close is not a function');
      //
      expect(serverApp.adapter)
          .to.be.a('function', 'serverApp.adapter is not a function');

      expect(serverApp.events)
          .to.be.an('object', 'serverApp.events is not an object')
          .that.is.empty;
      
      expect(serverApp.namespaces)
          .to.be.an('array', 'serverApp.namespaces is not an array')
          .that.is.empty;
        
      expect(serverApp.currentNamespaces)
          .to.be.an('array', 'serverApp.currentNamespaces is not an array')
          .that.is.empty;
  });

  it('should link namespace \'/main\' into app', function() {
    serverApp.link('/', nsp);

    expect(serverApp.events)
          .to.be.an('object', 'serverApp.events is not an object')
          .that.has.property('/main')
          .that.is.an('array')
          .that.has.lengthOf(5);
      
    expect(serverApp.namespaces)
        .to.be.an('array', 'serverApp.namespaces is not an array')
        .to.eql(['/main']);
      
    expect(serverApp.currentNamespaces)
        .to.be.an('array', 'serverApp.currentNamespaces is not an array')
        .that.is.empty;
  });

  it('should link namespace \'/main\' into app (\'add\' method)', function() {
    serverApp.add('/', new NspBuilder('/main').add('nothing', ()=>{
      //
    }));

    expect(serverApp.events)
          .to.be.an('object', 'serverApp.events is not an object')
          .that.has.property('/main')
          .that.is.an('array')
          .that.has.lengthOf(6);
      
    expect(serverApp.namespaces)
        .to.be.an('array', 'serverApp.namespaces is not an array')
        .to.eql(['/main']);
      
    expect(serverApp.currentNamespaces)
        .to.be.an('array', 'serverApp.currentNamespaces is not an array')
        .that.is.empty;
  });

  it('should build app (clients can connect)', function() {
    server = http.createServer();
    const options = {};
    serverApp.build(server, options);

    expect(serverApp.events)
          .to.be.an('object', 'serverApp.events is not an object')
          .that.has.property('/main')
          .that.is.an('array')
          .that.has.lengthOf(6);

    expect(serverApp.namespaces)
        .to.be.an('array', 'serverApp.namespaces is not an array')
        .to.eql(['/main']);
      
    expect(serverApp.currentNamespaces)
        .to.be.an('array', 'serverApp.currentNamespaces is not an array')
        .to.eql(['/', '/main']);
  });

  it('should destroy app (disconnects all clients)', function() {
    serverApp.destroy();

    expect(serverApp.currentNamespaces)
        .to.be.an('array', 'serverApp.currentNamespaces is not an array')
        .that.is.empty;
  });

  it('should build and destroy app again', function() {
    serverApp.build();

    expect(serverApp.currentNamespaces)
        .to.be.an('array', 'serverApp.currentNamespaces is not an array')
        .to.eql(['/main']);

    serverApp.destroy();

    expect(serverApp.currentNamespaces)
        .to.be.an('array', 'serverApp.currentNamespaces is not an array')
        .that.is.empty;
  });
});