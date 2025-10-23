/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * WebSocket server.
 */


// built-in modules
import * as assert from "assert";
import * as EventEmitter from "events";
import * as http from "http";
import * as querystring from "querystring";
import * as url from "url";


// installed modules
import * as Debug from "debug";
import * as WebSocket from "ws";


// own modules
import * as constants from "./constants";
import Socket from "./socket";
import * as types from "../types";


// module variables
const debug = Debug("@forfuture/wserver:server");


class Server extends EventEmitter {
    public options: types.IServer.IConstructorOptions;
    public sockets: Socket[] = [];
    private wss: WebSocket.Server;
    private pingTimeout;
    private closing = false;

    constructor(server: http.Server, options: types.IServer.IConstructorOptions = {}) {
        super();
        this.options = Object.assign({
            path: "/ws",
            authenticateSocket: null,
            handleRequest: null,
            pingInterval: 60 * 1000,
            ignoreConnReset: true,
        }, options);

        this.wss = new WebSocket.Server({ server, path: this.options.path });
        this.wss.on("connection", this.registerSocket.bind(this));
        this.pingTimeout = setInterval(this.pingSockets.bind(this), this.options.pingInterval);
    }

    public async close(): Promise<void> {
        assert.equal(this.closing, false, "WebSocket-Server already closing");
        this.closing = true;
        clearInterval(this.pingTimeout);
        for (const socket of this.sockets) {
            await (socket.close(constants.WEBSOCKET_CLOSE_CODES.TRY_AGAIN_LATER));
        }
        await (new Promise<void>((a, b) => {
            this.wss.close((e) => e ? b(e) : a());
        }));
        return;
    }

    public pingSockets() {
        const sieve = [];
        this.sockets.forEach(function(socket) {
            if (!socket.isAlive) {
                debug("socket dropped");
                socket.ws.terminate();
                return;
            }
            socket.ping();
            sieve.push(socket);
        });
        this.sockets = sieve;
    }

    public async notifyAll(event: string, payload: types.IHash|string): Promise<void> {
        await (this.sockets.map((socket) => socket.notify(event, payload)));
        return;
    }

    private async registerSocket(ws: WebSocket, req: types.IServer.IIncomingMessage) {
        debug("handling new socket");
        const socket = new Socket(ws, {
            ignoreConnReset: this.options.ignoreConnReset,
        });
        if (this.closing) {
            return socket.close(new Error("Server is shutting down"));
        }
        let wasAuthenticated = false;
        if (this.options.authenticateSocket) {
            req.query = url.parse(req.url, true).query as querystring.ParsedUrlQuery;
            try {
                socket.profile = await (this.options.authenticateSocket(req));
                wasAuthenticated = true;
            } catch (error) {
                return socket.close(error);
            }
        }
        this.emit("socket", socket);
        this.sockets.push(socket);
        socket.on("request", this.handleRequest.bind(this));
        if (wasAuthenticated && this.options.authenticatedNotification) {
            socket.notify(this.options.authenticatedNotification, {});
        }
    }

    private async handleRequest(request: types.ISocket.IRequest, socket: Socket) {
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
