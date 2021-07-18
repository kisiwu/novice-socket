import { Namespace, Socket, Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Replier } from '../definitions';


function _createReplier(socket: Socket, nsp: Namespace, io: Server): Replier {

  const replier: Replier = ( () => {
    const _replier: Partial<Replier> = function (
    event: string | ((socket: Socket, nsp: Namespace, io: Server) => void), 
    ...args: unknown[]) {
      if (typeof event === 'function') {
        return event(socket, nsp, io);
      }
      socket.emit(event, ...args);
    }

    _replier.emit = _replier as Replier;
    
    _replier.except = (room: string | string[]) => {
      return socket.except(room);
    };
    _replier.in = (room: string | string[]) => {
      return socket.to(room);
    };
    _replier.to = (room: string | string[]) => {
      return socket.to(room);
    };

    Object.defineProperties(_replier, {
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
          socket.volatile;
          return _replier;
        }
      },
      compressed: {
        configurable: false,
        enumerable: true,
        get: () => {
          socket.compress(true);
          return _replier;
        }
      },
      notCompressed: {
        configurable: false,
        enumerable: true,
        get: () => {
          socket.compress(false);
          return _replier;
        }
      }
    });

    _replier.of = function(
      name: string | RegExp | ((
        name: string,
        query: { [key: string]: unknown },
        next: (err: Error | null, success: boolean) => void
      ) => void), 
      fn?: ((socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>) => void)): Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap> {
      return io.of(name, fn);
    };

    return _replier as Replier;
  })();

  return replier;
}

export default function createReplier(socket: Socket, nsp: Namespace, io: Server): Replier {
  /*
  var socketReplier = (event, data, dest) => {
    if (typeof event === "function") {
      return event(socket, nsp, io);
    }

    // check name (reserved names)
    if(reservedEvents.indexOf(event) > -1) {
      return;
    }

    if (dest == "broadcast") {
      socket.broadcast.emit(event, data);
      return;
    }

    if (dest == "volatile") {
      socket.volatile.emit(event, data);
      return;
    }

    if (dest == "binary") {
      socket.binary(true).emit(event, data);
      return;
    }

    if (dest == "all") {
      nsp.emit(event, data);
      // socket.broadcast.emit(event, data);
      // socket.emit(event, data);
      return;
    }

    if (dest == "self" && socket.room) {
      socket.emit(event, data);
      return;
    }

    if (dest == "in" && socket.room) {
      nsp.in(socket.room).emit(event, data);
      return;
    }

    if (dest == "to" && socket.room) {
      socket.to(socket.room).emit(event, data);
      return;
    }

    // @todo: [custom] emit aimed at other sockets
  };
  */

  return _createReplier(socket, nsp, io);
}
