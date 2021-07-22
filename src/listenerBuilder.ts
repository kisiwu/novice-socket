import { flatten } from 'array-flatten';
import { Namespace, Server, Socket } from 'socket.io';
import toArray from './utils/toArray';
import createResponse from './utils/createResponse';
import {
  Controller, 
  ListenerBuilderJson, 
  ListenerBuilderSettings, 
  Request, 
  Response,
  NextFunc,
  ErrorController
} from './definitions';

/**
 * Event builder
 */
export class ListenerBuilder<DataType = unknown, ErrorType = unknown> {
  name: string;
  handlers: Controller<DataType, ErrorType>[];
  tags: string[];
  description?: string;

  #errorController?: ErrorController<ErrorType, DataType>;

  /**
   * 
   * @param settings The settings or the name of the event
   * @param handlers 
   */
  constructor(settings: ListenerBuilderSettings | string, ...handlers: Controller<DataType, ErrorType>[]);
  constructor(settings: ListenerBuilderSettings | string, ...handlers: Controller<DataType, ErrorType>[]) {
    this.name = '';
    this.tags = [];
    this.handlers = toArray<Controller<DataType, ErrorType>>(
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

  private callErrorController(err: ErrorType, req: Request<DataType>, res: Response): void {
    if (this.#errorController) {
      this.#errorController(err, req, res);
    }
  }

  /**
   * @description Listen to next(error) from Controller
   */
  setErrorController(fn: ErrorController<ErrorType, DataType>): ListenerBuilder<DataType, ErrorType> {
    this.#errorController = fn;
    return this;
  }

  /**
   * @description Stop listening to next(error) from Controller
   */
  removeErrorController(): ListenerBuilder<DataType, ErrorType> {
    this.#errorController = undefined;
    return this;
  }

  /**
   * @todo 3rd param as onError callback
   */
  handle(req: Request<DataType>, res: Response): void {
    let nexts: (NextFunc<ErrorType>)[]| undefined = [];
    this.handlers
      .map(v => v)
      .reverse()
      .forEach(handle => {
        let next = (err?: ErrorType) => {
          if (err) {
            this.callErrorController(err, req, res);
          }
        };
        if (nexts) {
          if (nexts.length) {
            next = nexts[nexts.length - 1];
          }
          nexts.push((err?: ErrorType) => {
            if (err) {
              return this.callErrorController(err, req, res);
            }
            return handle(req, res, next);
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
    socket.on(this.name, (...args: DataType[]) => {
      const req: Request<DataType> = {
        data: args, 
        event: this.toJson(),
        nsp: nsp,
        socket: socket,
        handshake: socket.handshake
      };
      this.handle(req, createResponse(socket, nsp, io));
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
