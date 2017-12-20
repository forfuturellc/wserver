"use strict";
/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * WebSocket server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// built-in modules
const assert = require("assert");
const EventEmitter = require("events");
const url = require("url");
// installed modules
const asyncawait_1 = require("asyncawait");
const Debug = require("debug");
const WebSocket = require("ws");
// own modules
const constants = require("./constants");
const socket_1 = require("./socket");
// module variables
const debug = Debug("@forfuture/wserver:server");
class Server extends EventEmitter {
    constructor(server, options = {}) {
        super();
        this.sockets = [];
        this.closing = false;
        this.options = Object.assign({
            path: "/ws",
            authenticateSocket: null,
            handleRequest: null,
            pingInterval: 60 * 1000,
            ignoreConnReset: true,
        }, options);
        this.close = asyncawait_1.async(this.close); // TODO/types:any
        this.notifyAll = asyncawait_1.async(this.notifyAll); // TODO/types:any
        this.registerSocket = asyncawait_1.async(this.registerSocket); // TODO/types:any
        this.handleRequest = asyncawait_1.async(this.handleRequest).bind(this); // TODO/types:any
        this.wss = new WebSocket.Server({ server, path: this.options.path });
        this.wss.on("connection", this.registerSocket.bind(this));
        this.pingTimeout = setInterval(this.pingSockets.bind(this), this.options.pingInterval);
    }
    close() {
        assert.equal(this.closing, false, "WebSocket-Server already closing");
        this.closing = true;
        clearInterval(this.pingTimeout);
        for (const socket of this.sockets) {
            asyncawait_1.await(socket.close(constants.WEBSOCKET_CLOSE_CODES.TRY_AGAIN_LATER));
        }
        asyncawait_1.await(new Promise((a, b) => {
            this.wss.close((e) => e ? b(e) : a());
        }));
        return;
    }
    pingSockets() {
        const sieve = [];
        this.sockets.forEach(function (socket) {
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
    notifyAll(event, payload) {
        asyncawait_1.await(this.sockets.map((socket) => socket.notify(event, payload)));
        return;
    }
    registerSocket(ws, req) {
        debug("handling new socket");
        const socket = new socket_1.default(ws, {
            ignoreConnReset: this.options.ignoreConnReset,
        });
        if (this.closing) {
            return socket.close(new Error("Server is shutting down"));
        }
        if (this.options.authenticateSocket) {
            req.query = url.parse(req.url, true).query;
            try {
                socket.profile = asyncawait_1.await(this.options.authenticateSocket(req));
            }
            catch (error) {
                return socket.close(error);
            }
        }
        this.emit("socket", socket);
        this.sockets.push(socket);
        socket.on("request", this.handleRequest);
    }
    handleRequest(request, socket) {
        debug("handling message from socket: %s", request.action);
        if (!this.options.handleRequest) {
            return socket.rejectRequest(request, new Error("NotImplemented"));
        }
        let result;
        try {
            result = asyncawait_1.await(this.options.handleRequest(request, socket));
        }
        catch (error) {
            return socket.rejectRequest(request, error);
        }
        return socket.acceptRequest(request, result);
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map