import { Namespace, Socket, Server } from 'socket.io';
import { Response } from '../definitions';


function createResponse(socket: Socket, nsp: Namespace, io: Server): Response {

  const response: Response = ( () => {
    const _response: Partial<Response> = function (
      eventName: string | ((socket: Socket, nsp: Namespace, io: Server) => void), 
    ...args: unknown[]) {
      if (typeof eventName === 'function') {
        return eventName(socket, nsp, io);
      }
      socket.emit(eventName, ...args);
    }

    _response.emit = _response as Response;
    
    _response.except = (room: string | string[]) => {
      return socket.except(room);
    };
    _response.in = (room: string | string[]) => {
      return socket.to(room);
    };
    _response.to = (room: string | string[]) => {
      return socket.to(room);
    };

    Object.defineProperties(_response, {
      broadcast: {
        configurable: false,
        enumerable: true,
        get: () => {
          return socket.broadcast;
        }
      },
      volatile: {
        configurable: false,
        enumerable: true,
        get: () => {
          return socket.volatile;
        }
      },
      compressed: {
        configurable: false,
        enumerable: true,
        get: () => {
          socket.compress(true);
          return _response;
        }
      },
      notCompressed: {
        configurable: false,
        enumerable: true,
        get: () => {
          socket.compress(false);
          return _response;
        }
      }
    });

    _response.of = function(
      name?: string | RegExp | ((
        name: string,
        query: { [key: string]: unknown },
        next: (err: Error | null, success: boolean) => void
      ) => void), 
      fn?: ((socket: Socket) => void)): Namespace {
      let r = nsp; 
      if (name) {
        r = io.of(name, fn);
      }
      return r;
    };

    return _response as Response;
  })();

  return response;
}

export default createResponse;
