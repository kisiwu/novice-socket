import { Namespace, Server, ServerOptions, Socket } from 'socket.io';
import { Adapter } from 'socket.io-adapter';
import { Server as HttpServer } from 'http'
import { flatten } from 'array-flatten';
import NspBuilder from './nspBuilder';
import toArray from './utils/toArray';

import ListenerBuilder from './listenerBuilder';
import {
  Middleware,
  SocketMiddleware,
  ListenerBuilderJson,
  Controller,
  ListenerBuilderSettings
} from './definitions';

export class ServerApp {
  #onConnectionFn: ((socket: Socket, nsp: Namespace, server: Server) => void)[];
  #onDisconnectFn: ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[];
  #namespaces: string[];
  #router?: NspBuilder;
  #io?: Server;

  /**
   * @param namespaces Limits application to some namespaces.
   */
  constructor(namespaces?: string | string[]) {
    this.#namespaces = toArray(namespaces, 'string');
    this.#onConnectionFn = [];
    this.#onDisconnectFn = [];
  }

  get events(): Record<string, ListenerBuilderJson[]> {
    return this.getEvents();
  }

  get namespaces(): string[] {
    return this.getPaths();
  }

  get activeNamespaces(): string[] {
    return this.getNamespaces();
  }

  get currentNamespaces(): string[] {
    return this.getNamespaces();
  }

  /**
   * In case you need to do something
   * that this lib cannot do. (e.g.: socket.io v4.x.x methods)
   */
  get server(): Server | undefined {
    return this.getServer();
  }

  private routing(): NspBuilder {
    if (!this.#router) {
      this.#router = new NspBuilder();
    }
    return this.#router;
  }

  private _onConnection(reset: boolean, fn: ((socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp {
    if (reset) {
      this.#onConnectionFn = [];
    }
    this.#onConnectionFn.push(...fn);
    return this;
  }

  private _onDisconnect(reset: boolean, fn: ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp {
    if (reset) {
      this.#onDisconnectFn = [];
    }
    this.#onDisconnectFn.push(...fn);
    return this;
  }

  /**
   * @description Add listener (event)
   */
  add<DataType, ErrorType>(name: string, ...fn: Controller<DataType, ErrorType>[]): ServerApp;
  add<DataType, ErrorType>(name: ListenerBuilderSettings, ...fn: Controller<DataType, ErrorType>[]): ServerApp;
  add(...fn: ListenerBuilder[]): ServerApp;
  add(...fn: (ListenerBuilder[])[]): ServerApp;
  /**
   * @description NspBuilder.addMiddlewares
   */
  add(...fn: SocketMiddleware[]): ServerApp;
  add(...fn: (SocketMiddleware[])[]): ServerApp;
  /**
   * @description NspBuilder.link
   */
  add(...fn: NspBuilder[]): ServerApp;
  add(namespace: string, ...fn: NspBuilder[]): ServerApp;
  add(...fn: (NspBuilder[])[]): ServerApp;

  add(name: string | ListenerBuilderSettings | SocketMiddleware | SocketMiddleware[] | ListenerBuilder | ListenerBuilder[] | NspBuilder | NspBuilder[],
    ...fn: (Controller | SocketMiddleware | SocketMiddleware[] | ListenerBuilder | ListenerBuilder[] | NspBuilder | NspBuilder[])[]): ServerApp {
    this.routing()
      .add(name, ...fn);
    return this;
  }

  use(...fn: Middleware[]): ServerApp;
  use(fn: Middleware[]): ServerApp;
  use(...fn: (Middleware | Middleware[])[]): ServerApp {
    this.routing()
      .use(...fn);
    return this;
  }

  link(...fn: NspBuilder[]): ServerApp;
  link(...fn: (NspBuilder[])[]): ServerApp;
  link(namespace: string, ...fn: NspBuilder[]): ServerApp;
  link(namespace: string, ...fn: (NspBuilder[])[]): ServerApp;
  link(name: string | (NspBuilder | NspBuilder[]), ...fn: (NspBuilder | NspBuilder[])[]): ServerApp;
  link(name: string | (NspBuilder | NspBuilder[]), ...fn: (NspBuilder | NspBuilder[])[]): ServerApp {
    if (this.#io) {
      throw new Error('ServerApp.link() cannot be called after ServerApp.build()')
    }
    this.routing()
      .link(name, ...fn);
    return this;
  }

  getPaths(): string[] {
    let r: string[] = [];
    if (!this.#router) {
      return r;
    }
    r = this.#router.getPaths();
    if (this.#namespaces.length) {
      r = r.filter(p => this.#namespaces.indexOf(p) > -1);
    }
    return r;
  }

  getEvents(): Record<string, ListenerBuilderJson[]> {
    let r: Record<string, ListenerBuilderJson[]> = {};
    if (!this.#router) {
      return r;
    }
    r = this.#router.getEvents();
    if (this.#namespaces.length) {
      Object.keys(r).filter(k => {
        if (this.#namespaces.indexOf(k) == -1) {
          delete r[k];
        }
      });
    }
    return r;
  }

  /**
   * 
   * @param name Default: '/'
   */
  getNamespace(name = '/'): Namespace | undefined {
    let nsp: Namespace | undefined;
    if (this.#io) {
      nsp = this.#io._nsps.get(name || '/');
    }
    return nsp;
  }

  getNamespaces(): string[] {
    let nsps: string[] = [];
    if (this.#io) {
      nsps = Array.from(this.#io._nsps.keys());
    }
    return nsps;
  }

  build(opts?: Partial<ServerOptions> | undefined): ServerApp;
  build(srv?: number | HttpServer | undefined, opts?: Partial<ServerOptions>): ServerApp;
  build(srv: number | Partial<ServerOptions> | HttpServer | undefined, opts?: Partial<ServerOptions>): ServerApp;
  build(srv?: number | Partial<ServerOptions> | HttpServer | undefined, opts?: Partial<ServerOptions>): ServerApp {
    this.destroy();

    if (!this.#io) {
      this.#io = new Server(srv, opts);
    }
    const server: Server = this.#io;

    const mainRouter: NspBuilder = this.routing();

    this.getPaths().forEach(
      namespace => {
        const nsp = server.of(namespace);

        // register nsp middlewares
        mainRouter.registerMiddlewares(
          namespace,
          nsp,
          server
        );

        // connection event
        nsp.on('connection', (socket) => {
          // socket.handshake.auth;

          this.#onConnectionFn.forEach(
            fn => fn(socket, nsp, server)
          );

          // disconnect event
          socket.on('disconnect', (reason) => {
            this.#onDisconnectFn.forEach(
              fn => fn(reason, socket, nsp, server)
            );
          });

          // register events
          mainRouter.registerEvents(
            namespace,
            socket,
            nsp,
            server
          );
        });
      }
    );

    return this;
  }

  destroy(): ServerApp {
    if (this.#io && this.#io._nsps) {
      const server: Server = this.#io;
      // server.disconnectSockets(true); // Added in v4.0.0
      // for each namespace
      server._nsps.forEach(
        (nsp, k) => {
          // disconnect sockets
          nsp.disconnectSockets(true);
          // remove listeners
          nsp.removeAllListeners();
          // remove from the server namespaces
          server._nsps.delete(k);
        }
      );
    }
    return this;
  }

  adapter(): ServerApp;
  adapter(v: typeof Adapter): ServerApp;
  adapter(v: ((nsp: Namespace) => Adapter)): ServerApp;
  adapter(v: typeof Adapter | ((nsp: Namespace) => Adapter)): ServerApp;
  adapter(v?: typeof Adapter | ((nsp: Namespace) => Adapter)): ServerApp {
    if (this.#io) {
      if (!v) {
        this.#io.adapter();
      } else {
        this.#io.adapter(v);
      }
    }
    return this;
  }

  /**
   * Closes the Socket.IO server.
   * 
   * Note: this also closes the underlying HTTP server.
   */
  close(): Promise<void>;
  close(fn: (err?: Error) => void): void;
  close(fn?: (err?: Error) => void): void | Promise<void> {
    let r;
    if (this.#io) {
      const server = this.#io;
      if (fn) {
        r = server.close(fn);
      } else {
        r = new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if(err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }
    return r;
  }

  onConnection(...fn: ((socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  onConnection(fn: ((socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  onConnection(...fn: (
    ((socket: Socket, nsp: Namespace, server: Server) => void)
    | ((socket: Socket, nsp: Namespace, server: Server) => void)[]
  )[]): ServerApp {
    const args = toArray<(socket: Socket, nsp: Namespace, server: Server) => void>(flatten(fn), 'function');
    return this._onConnection(true, args);
  }

  addOnConnection(...fn: ((socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  addOnConnection(fn: ((socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  addOnConnection(...fn: (
    ((socket: Socket, nsp: Namespace, server: Server) => void)
    | ((socket: Socket, nsp: Namespace, server: Server) => void)[]
  )[]): ServerApp {
    const args = toArray<(socket: Socket, nsp: Namespace, server: Server) => void>(flatten(fn), 'function');
    return this._onConnection(false, args);
  }

  onDisconnect(...fn: ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  onDisconnect(fn: ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  onDisconnect(...fn: (
    ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)
    | ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]
  )[]): ServerApp {
    const args = toArray<(reason: string, socket: Socket, nsp: Namespace, server: Server) => void>(flatten(fn), 'function');
    return this._onDisconnect(true, args);
  }

  addOnDisconnect(...fn: ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  addOnDisconnect(fn: ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]): ServerApp;
  addOnDisconnect(...fn: (
    ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)
    | ((reason: string, socket: Socket, nsp: Namespace, server: Server) => void)[]
  )[]): ServerApp {
    const args = toArray<(reason: string, socket: Socket, nsp: Namespace, server: Server) => void>(flatten(fn), 'function');
    return this._onDisconnect(false, args);
  }

  /**
   * In case you need to do something
   * that this lib cannot do. (e.g.: socket.io v4.x.x methods)
   */
  getServer(): Server | undefined {
    return this.#io;
  }
}


/**
 * @param namespaces Limits application to some namespaces.
 */
function createServerApp(namespaces?: string | string[]): ServerApp {
  return new ServerApp(namespaces);
}

export default createServerApp;

