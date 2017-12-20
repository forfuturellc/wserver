/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * WebSocket server.
 */


// built-in modules
import * as EventEmitter from "events";
import * as http from "http";
import * as querystring from "querystring";
import * as url from "url";


// installed modules
import { async, await } from "asyncawait";
import * as Debug from "debug";
import * as WebSocket from "ws";


// own modules
import Socket from "./socket";
import * as types from "../types";


// module variables
const debug = Debug("@forfuture/wserver:server");


class Server extends EventEmitter {
    public options: types.IServer.IConstructorOptions;
    public sockets: Socket[] = [];
    private wss: WebSocket.Server;
    private pingTimeout;

    constructor(server: http.Server, options: types.IServer.IConstructorOptions = {}) {
        super();
        this.options = Object.assign({
            path: "/ws",
            authenticateSocket: null,
            handleRequest: null,
            pingInterval: 60 * 1000,
            ignoreConnReset: true,
        }, options);

        this.close = async(this.close) as any; // TODO/types:any
        this.notifyAll = async(this.notifyAll) as any; // TODO/types:any
        this.registerSocket = async(this.registerSocket) as any; // TODO/types:any
        this.handleRequest = (async(this.handleRequest) as any).bind(this); // TODO/types:any

        this.wss = new WebSocket.Server({ server, path: this.options.path });
        this.wss.on("connection", this.registerSocket.bind(this));
        this.pingTimeout = setInterval(this.pingSockets.bind(this), this.options.pingInterval);
    }

    public close(): Promise<void> {
        await (new Promise((a, b) => {
            this.wss.close((e) => e ? b(e) : a());
        }));
        clearInterval(this.pingTimeout);
        for (const socket of this.sockets) {
            try {
                await (socket.close(1000));
            } catch (error) {
                debug("error closing socket during server shutdown:", error);
            }
        }
        return;
    }

    public pingSockets() {
        const sieve = [];
        this.sockets.forEach(function(socket) {
            if (!socket.isAlive) {
                debug("socket dropped.");
                socket.ws.terminate();
                return;
            }
            socket.ping();
            sieve.push(socket);
        });
        this.sockets = sieve;
    }

    public notifyAll(event: string, payload: types.IHash|string): Promise<void> {
        await (this.sockets.map((socket) => socket.notify(event, payload)));
        return;
    }

    private registerSocket(ws: WebSocket, req: types.IServer.IIncomingMessage) {
        debug("handling new socket");
        const socket = new Socket(ws, {
            ignoreConnReset: this.options.ignoreConnReset,
        });
        if (this.options.authenticateSocket) {
            req.query = url.parse(req.url, true).query as querystring.ParsedUrlQuery;
            try {
                socket.profile = await (this.options.authenticateSocket(req));
            } catch (error) {
                return socket.close(error);
            }
        }
        this.emit("socket", socket);
        this.sockets.push(socket);
        socket.on("request", this.handleRequest);
    }

    private handleRequest(request: types.ISocket.IRequest, socket: Socket) {
        debug("handling message from socket: %s", request.action);
        if (!this.options.handleRequest) {
            return socket.rejectRequest(request, new Error("NotImplemented"));
        }

        let result;

        try {
            result = await (this.options.handleRequest(request, socket));
        } catch (error) {
            return socket.rejectRequest(request, error);
        }
        return socket.acceptRequest(request, result);
    }
}


export default Server;
