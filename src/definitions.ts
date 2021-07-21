import { BroadcastOperator, Namespace, Socket, Server } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Handshake } from 'socket.io/dist/socket'
import { ExtendedError } from 'socket.io/dist/namespace';

export type Middleware = ((socket: Socket, next: (err?: ExtendedError | undefined) => void) => void); 
export type SocketMiddleware = ((socket: Socket, event: unknown[], next: (err?: Error | undefined) => void) => void);

export type NextFunc<Err = unknown> = ((err?: Err | undefined) => void);

export interface ListenerBuilderSettings {
  name: string;
  description?: string;
  tags?: string|string[];
}

export interface ListenerBuilderJson extends ListenerBuilderSettings {
  tags: string[];
}

export interface Request<DataTypes = unknown> {
  data: DataTypes[],
  event: ListenerBuilderJson, 
  nsp: Namespace,
  socket: Socket,
  handshake: Handshake
}

export interface Replier {
  (
    event: string | ((socket: Socket, nsp: Namespace, io: Server) => void), 
    ...args: unknown[]): void;
    
  emit: Replier;

  except: (room: string | string[]) => BroadcastOperator<DefaultEventsMap>;
  in: (room: string | string[]) => BroadcastOperator<DefaultEventsMap>;
  to: (room: string | string[]) => BroadcastOperator<DefaultEventsMap>;

  broadcast: BroadcastOperator<DefaultEventsMap>;
  volatile: Replier;
  compressed: Replier;
  notCompressed: Replier,
  
  of: (
    name: string | RegExp | ((
      name: string,
      query: { [key: string]: unknown },
      next: (err: Error | null, success: boolean) => void
    ) => void), 
    fn?: ((socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>) => void)) => Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>;
  
}

export interface Controller<DataTypes = unknown, ErrorType = unknown> {
  (
    req: Request<DataTypes>,
    res: Replier,
    next: NextFunc<ErrorType>,
    ...args: unknown[]
  ): void
}

export interface ErrorController<Err = unknown, T = unknown> {
  (
    err: Err,
    req: Request<T>,
    res: Replier
  ): void
}