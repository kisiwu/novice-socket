/* eslint-disable @typescript-eslint/no-explicit-any */
import { BroadcastOperator, Namespace, Socket, Server } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { Handshake } from 'socket.io/dist/socket-types';
import { DefaultEventsMap, EventsMap } from 'socket.io/dist/typed-events';

export type Middleware = (socket: Socket, next: (err?: ExtendedError | undefined) => void) => void;
export type SocketMiddleware = (socket: Socket, event: unknown[], next: (err?: Error | undefined) => void) => void;

export type NextFunc<ErrorType = unknown> = (err?: ErrorType | undefined) => void;

export interface ListenerBuilderSettings {
    name: string;
    description?: string;
    tags?: string | string[];
}

export interface ListenerBuilderJson extends ListenerBuilderSettings {
    tags: string[];
}

export interface Request<DataType = unknown> {
    data: DataType[];
    event: ListenerBuilderJson;
    nsp: Namespace;
    socket: Socket;
    handshake: Handshake;
}

/**
 * Especially typed with parameters because of "BroadcastOperator"
 */
export interface Response<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents,
    ServerSideEvents extends EventsMap = DefaultEventsMap,
> {
    (
        eventName:
            | string
            | ((
                  socket: Socket<ListenEvents, EmitEvents, ServerSideEvents>,
                  nsp: Namespace<ListenEvents, EmitEvents, ServerSideEvents>,
                  io: Server<ListenEvents, EmitEvents, ServerSideEvents>
              ) => void),
        ...args: unknown[]
    ): void;

    emit: Response<ListenEvents, EmitEvents, ServerSideEvents>;

    except: <SocketData = any>(room: string | string[]) => BroadcastOperator<EmitEvents, SocketData>;
    in: <SocketData = any>(room: string | string[]) => BroadcastOperator<EmitEvents, SocketData>;
    to: <SocketData = any>(room: string | string[]) => BroadcastOperator<EmitEvents, SocketData>;

    broadcast: BroadcastOperator<EmitEvents, any>;
    volatile: Response<ListenEvents, EmitEvents, ServerSideEvents>;
    compressed: Response<ListenEvents, EmitEvents, ServerSideEvents>;
    notCompressed: Response<ListenEvents, EmitEvents, ServerSideEvents>;

    of: (
        name?:
            | string
            | RegExp
            | ((
                  name: string,
                  query: { [key: string]: unknown },
                  next: (err: Error | null, success: boolean) => void
              ) => void),
        fn?: (socket: Socket<ListenEvents, EmitEvents, ServerSideEvents>) => void
    ) => Namespace<ListenEvents, EmitEvents, ServerSideEvents>;
}

export interface Controller<DataType = unknown, ErrorType = unknown> {
    (req: Request<DataType>, res: Response, next: NextFunc<ErrorType>): void;
}

export interface ErrorController<ErrorType = unknown, DataType = unknown> {
    (err: ErrorType, req: Request<DataType>, res: Response): void;
}
