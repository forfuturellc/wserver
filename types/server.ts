/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * Server component.
 */


// built-in modules
import * as http from "http";
import * as querystring from "querystring";


// own modules
import * as base from "./base";
import * as socket from "./socket";


export interface IConstructorOptions {
    // HTTP request path to listen for WebSocket upgrade
    // requests.
    // Defaults to `"/ws"`.
    path?: string;
    // Notification sent to client once authentication
    // has completed successfully.
    authenticatedNotification?: string;
    // A function that returns a Promise that resolves
    // successfully to authenticate request, saving any
    // returned data in `socket.profile`. If promise is
    // rejected, authentication is considered failed.
    // By default, no authentication is performed.
    authenticateSocket?: (req: http.IncomingMessage) => Promise<base.IHash>;
    // A function for handling requests from websockets.
    handleRequest?: (req: socket.IRequest, socket: socket.Socket) => Promise<base.IHash>;
    // No. of milliseconds between pings.
    // Defaults to 60 seconds.
    pingInterval?: number;
    // Ignore `ECONNRESET` errors i.e. instead of emitting an `"error"`
    // event, that will require to be handled by user, emit a different
    // event (`"connection_reset"`) that user *may* choose to handle
    // themself. If ignoring, the socket is forcibly terminated.
    // Defaults to `true`.
    ignoreConnReset?: boolean;
}


export interface IIncomingMessage extends http.IncomingMessage {
    // Parsed query.
    query: querystring.ParsedUrlQuery;
}
