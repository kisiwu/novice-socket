import { flatten } from 'array-flatten';
import { Namespace, Server, Socket } from 'socket.io';
import ListenerBuilder from './listenerBuilder';
import {
  Middleware,
  SocketMiddleware,
  ListenerBuilderJson,
  Controller,
  ListenerBuilderSettings
} from './definitions'


export class NspBuilder {
  #_id: string;
  #name: string;
  
  #middlewares: Middleware[];
  #socketMiddlewares: SocketMiddleware[];
  #events: ListenerBuilder[];
  #stack: NspBuilder[];

  /**
   * 
   * @param name Default: '/'
   */
  constructor(name = '/') {
    this.#_id = Date.now() + '_' + ((Math.random() * 1000000) + 1000001)
    this.#name = '/';
    this.#middlewares = [];
    this.#socketMiddlewares = [];
    this.#events = [];
    this.#stack = [];

    if (name) {
      if (typeof name !== 'string') {
        throw new TypeError(
          '\'NspBuilder\' first argument should be a string'
        );
      }
      if (!name.startsWith('/')) {
        throw new SyntaxError(
          '\'NspBuilder\' first argument should be a string starting with \'/\''
        );
      }
      this.#name = name;
    }
  }

  get id(): string {
    return this.#_id
  }

  get name(): string {
    return this.#name
  }

  get events(): ListenerBuilder[] {
    return this.#events;
  }

  get middlewares(): Middleware[] {
    return this.#middlewares;
  }

  get socketMiddlewares(): SocketMiddleware[] {
    return this.#socketMiddlewares;
  }

  /**
   * @description Add listener (event)
   */
  add<DataType, ErrorType>(name: string | ListenerBuilderSettings, ...fn: Controller<DataType, ErrorType>[]): NspBuilder;
  add(...fn: ListenerBuilder[]): NspBuilder;
  add(...fn: (ListenerBuilder[])[]): NspBuilder;
  /**
   * @description NspBuilder.addMiddlewares
   */
  add(...fn: SocketMiddleware[]): NspBuilder;
  /**
   * @description NspBuilder.addMiddlewares
   */
  add(...fn: (SocketMiddleware[])[]): NspBuilder;
  /**
   * @description NspBuilder.link
   */
  add(namespace: string, ...fn: NspBuilder[]): NspBuilder;
  /**
   * @description NspBuilder.link
   */
  add(...fn: NspBuilder[]): NspBuilder;
  /**
   * @description NspBuilder.link
   */
  add(...fn: (NspBuilder[])[]): NspBuilder;

  add(name: string | ListenerBuilderSettings | SocketMiddleware | SocketMiddleware[] | ListenerBuilder | ListenerBuilder[] | NspBuilder | NspBuilder[],
    ...fn: (Controller | SocketMiddleware | SocketMiddleware[] | ListenerBuilder | ListenerBuilder[] | NspBuilder | NspBuilder[])[]): NspBuilder;
  add(name: string | ListenerBuilderSettings | SocketMiddleware | SocketMiddleware[] | ListenerBuilder | ListenerBuilder[] | NspBuilder | NspBuilder[],
    ...fn: (Controller | SocketMiddleware | SocketMiddleware[] | ListenerBuilder | ListenerBuilder[] | NspBuilder | NspBuilder[])[]): NspBuilder {

    let args = flatten(fn);
    let treatedFirstArg = false;

    if (typeof name === 'string'
      || (name && typeof name === 'object' && !Array.isArray(name))
      && !(name instanceof NspBuilder)
      && !(name instanceof ListenerBuilder)) {
        if (typeof name === 'string' && args.some(arg => (arg instanceof NspBuilder))) {
          return this.link(name, ...<NspBuilder[]>args.filter(arg => (arg instanceof NspBuilder)));
        } else {
          const handlers: Controller[] = <Controller[]>args.filter(arg => (typeof arg === 'function'));
          args = [new ListenerBuilder(name, ...handlers)];
        }
        treatedFirstArg = true;
    }

    // create 3 arrays from arguments
    const nspBuilders: NspBuilder[] = [];
    const socketMiddlewares: SocketMiddleware[] = [];
    const listenerBuilders: ListenerBuilder[] = [];
    if (!treatedFirstArg) {
      let firstArg = [name];
      if (Array.isArray(name)) {
        firstArg = flatten(name);
      }
      firstArg.forEach(arg => {
        if (arg instanceof NspBuilder) {
          nspBuilders.push(arg);
        } else if (arg instanceof ListenerBuilder) {
          listenerBuilders.push(arg);
        } else if (typeof arg === 'function') {
          socketMiddlewares.push(<SocketMiddleware>arg);
        }
      });
    }
    args.forEach(arg => {
      if (arg instanceof NspBuilder) {
        nspBuilders.push(arg);
      } else if (arg instanceof ListenerBuilder) {
        listenerBuilders.push(arg);
      } else if (typeof arg === 'function') {
        socketMiddlewares.push(<SocketMiddleware>arg);
      }
    });

    // if some instances of NspBuilder
    if (nspBuilders.length) {
      this.link(...nspBuilders);
    }
    // if some SocketMiddlware
    if (socketMiddlewares.length) {
      this.addMiddlewares(...socketMiddlewares);
    }
    // if some ListenerBuilder
    if (listenerBuilders.length) {
      let newEvents = this.#events.concat(listenerBuilders);

      // remove duplicate events (by name)
      newEvents = newEvents
        .map(ev => ev)
        .reverse();
      newEvents = newEvents.filter((a, idx) => {
        return newEvents.findIndex((
          b => b.name === a.name
        )) == idx
      })
        .sort((a, b) => {
          let sort = 0;
          if (a.name > b.name) {
            sort = 1
          } else if (a.name < b.name) {
            sort = -1;
          }
          return sort;
        });

      this.#events = newEvents;
    }

    return this;
  }

  /**
   * @description Adds a socket's middleware (socket.use)
   */
  addMiddlewares(...fn: SocketMiddleware[]): NspBuilder;
  addMiddlewares(fn: SocketMiddleware[]): NspBuilder;
  addMiddlewares(...fn: (SocketMiddleware | SocketMiddleware[])[]): NspBuilder {
    const callbacks = flatten(fn);

    if (callbacks.length === 0) {
      throw new TypeError('NspBuilder.addMiddlewares() requires a function')
    }

    for (let i = 0; i < callbacks.length; i++) {
      const fn = callbacks[i];

      if (typeof fn !== 'function') {
        throw new TypeError('NspBuilder.addMiddlewares() requires a function but got a ' + (typeof fn))
      }

      this.#socketMiddlewares.push(fn);
    }

    return this;
  }

  /**
   * @description Adds a namespace's middleware (namespace.use)
   */
  use(...fn: Middleware[]): NspBuilder;
  use(fn: Middleware[]): NspBuilder;
  use(...fn: (Middleware | Middleware[])[]): NspBuilder;
  use(...fn: (Middleware | Middleware[])[]): NspBuilder {
    const callbacks = flatten(fn);

    if (callbacks.length === 0) {
      throw new TypeError('NspBuilder.use() requires a function')
    }

    for (let i = 0; i < callbacks.length; i++) {
      const fn = callbacks[i];

      if (typeof fn !== 'function') {
        throw new TypeError('NspBuilder.use() requires a function but got a ' + (typeof fn))
      }

      this.#middlewares.push(fn);
    }

    return this;
  }

  link(namespace: string, ...fn: NspBuilder[]): NspBuilder;
  link(namespace: string, ...fn: (NspBuilder[])[]): NspBuilder;
  link(...fn: NspBuilder[]): NspBuilder;
  link(...fn: (NspBuilder[])[]): NspBuilder;
  link(name: string | (NspBuilder | NspBuilder[]), ...fn: (NspBuilder | NspBuilder[])[]): NspBuilder;
  link(name: string | (NspBuilder | NspBuilder[]), ...fn: (NspBuilder | NspBuilder[])[]): NspBuilder {
    let offset = 0;
    let namespace = '/';

    // default namespace to '/'
    // disambiguate NspBuilder.link([fn])
    if (typeof name === 'string') {
      offset = 1;
      namespace = name;
    } else {
      fn.unshift(name);
    }

    const callbacks = flatten(fn);

    if (callbacks.length === 0) {
      throw new TypeError('NspBuilder.link() requires a NspBuilderC')
    }

    for (let i = 0; i < callbacks.length; i++) {
      const fn = callbacks[i];

      if (!(fn instanceof NspBuilder)) {
        throw new TypeError('NspBuilder.link() requires a NspBuilderC but got a ' + (typeof fn))
      }

      if (fn.id === this.id) {
        throw new ReferenceError('NspBuilder.link() shouldn\'t receive itself')
      }

      if (!offset) {
        this.#stack.push(fn);
      }
    }

    if (offset) {
      const router = new NspBuilder(namespace);
      this.#stack.push(router.link(callbacks));
    }

    return this;
  }

  registerMiddlewares(namespace: string, nsp: Namespace, io: Server): void {
    if (namespace == this.name) {
      this.#middlewares.forEach(
        middleware => {
          nsp.use(middleware);
        }
      );
    }
    if (this.#stack.length && namespace.startsWith(this.name)) {
      let subpath = namespace.substring(this.name.length);
      if (!subpath.startsWith('/')) {
        subpath = '/' + subpath;
      }
      this.#stack.forEach(
        router => router.registerMiddlewares(subpath, nsp, io)
      );
    }
  }

  registerEvents(namespace: string, socket: Socket, nsp: Namespace, io: Server): void {
    if (namespace == this.name) {
      this.#socketMiddlewares.forEach(
        middleware => {
          socket.use((packet, next) => {
            middleware(socket, packet, next)
          });
        }
      );
      this.#events.forEach(event => {
        event.register(socket, nsp, io);
      });
    }

    if (this.#stack.length && namespace.startsWith(this.name)) {
      let subpath = namespace.substring(this.name.length);
      if (!subpath.startsWith('/')) {
        subpath = '/' + subpath;
      }
      this.#stack.forEach(
        router => router.registerEvents(subpath, socket, nsp, io)
      );
    }
  }

  getPaths(namespace?: string): string[] {
    const v: string[] = [];
    let insertCurrentPath = false;

    if (!namespace) {
      namespace = this.name;
      insertCurrentPath = true;
    } else if (namespace === '/') {
      if (this.name !== '/') {
        namespace = this.name;
        insertCurrentPath = true;
      }
    } else {
      if (this.name !== '/') {
        namespace = (`${namespace}${this.name}`);
        insertCurrentPath = true;
      }
    }

    if (insertCurrentPath) {
      v.push(namespace);
    }

    this.#stack.forEach(
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

  getEvents(namespace?: string): Record<string, ListenerBuilderJson[]> {
    const v: Record<string, ListenerBuilderJson[]> = {};

    if (!namespace || namespace === '/') {
      namespace = this.name;
    } else {
      if (this.name !== '/') {
        namespace = (`${namespace}${this.name}`);
      }
    }

    v[namespace] = this.#events.map(ev => ev.toJson());

    this.#stack.forEach(
      router => {
        const sub = router.getEvents(namespace);
        Object.keys(sub).forEach(
          k => {
            if (sub[k].length) {
              if (v[k]) {
                v[k].push(...sub[k])
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
}

export default NspBuilder;