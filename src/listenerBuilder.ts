import { flatten } from 'array-flatten';
import { Namespace, Server, Socket } from 'socket.io';
import toArray from './utils/toArray';
import createReplier from './rep/createReplier';
import {
  Controller, 
  ListenerBuilderJson, 
  ListenerBuilderSettings, 
  Request, 
  Replier,
  NextFunc
} from './definitions';

/**
 * Event builder
 */
export class ListenerBuilder {
  name: string;
  handlers: Controller[];
  tags: string[];
  description?: string;

  /**
   * 
   * @param settings The settings or the name of the event
   * @param handlers 
   */
  constructor(settings: ListenerBuilderSettings | string, ...handlers: Controller[]);
  constructor(settings: ListenerBuilderSettings | string, ...handlers: Controller[]) {
    this.name = '';
    this.tags = [];
    this.handlers = toArray<Controller>(
      flatten(handlers),
      'function'
    );

    if(!this.handlers.length) {
      throw new TypeError('ListenerBuilder constructor: requires a function');
    }

    if (settings) {
      let eventName;
      if (typeof settings === 'object') {
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
      if (eventName && typeof eventName === 'string') {
        this.name = eventName;
      }
    }

    if (!this.name) {
      throw new Error('ListenerBuilder constructor: Missing \'name\' property');
    }
  }

  /**
   * @todo 3rd param as onError callback
   */
  handle(req: Request, emit: Replier): void {
    let nexts: (NextFunc)[]| undefined = [];
    this.handlers
      .map(v => v)
      .reverse()
      .forEach(handle => {
        let next = () => {
          //
        };
        if (nexts) {
          if (nexts.length) {
            next = nexts[nexts.length - 1];
          }
          nexts.push((err: unknown) => {
            if (err) {
              // @todo do something
              return;
            }
            return handle(req, emit, next);
          });
        }
      });

    if (nexts.length) {
      const n = nexts[nexts.length - 1];
      nexts = undefined;
      n();
    }
  }

  register(socket: Socket, nsp: Namespace, io: Server): void {
    socket.on(this.name, (...args: unknown[]) => {
      const req: Request = {
        data: args, 
        event: this.toJson(),
        nsp: nsp,
        socket: socket,
        handshake: socket.handshake
      };
      // @todo: send 3rd param as onError callback
      this.handle(req, createReplier(socket, nsp, io));
    });
  }

  toJson(): ListenerBuilderJson {
    const v: ListenerBuilderJson = {
      name: this.name,
      tags: toArray(this.tags, 'string')
    };
    if (this.description) {
      v.description = this.description;
    }
    return v;
  }
}

export default ListenerBuilder;
