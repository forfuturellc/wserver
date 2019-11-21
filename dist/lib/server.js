"use strict";
/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * WebSocket server.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// built-in modules
const assert = require("assert");
const EventEmitter = require("events");
const url = require("url");
// installed modules
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
        this.wss = new WebSocket.Server({ server, path: this.options.path });
        this.wss.on("connection", this.registerSocket.bind(this));
        this.pingTimeout = setInterval(this.pingSockets.bind(this), this.options.pingInterval);
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            assert.equal(this.closing, false, "WebSocket-Server already closing");
            this.closing = true;
            clearInterval(this.pingTimeout);
            for (const socket of this.sockets) {
                yield (socket.close(constants.WEBSOCKET_CLOSE_CODES.TRY_AGAIN_LATER));
            }
            yield (new Promise((a, b) => {
                this.wss.close((e) => e ? b(e) : a());
            }));
            return;
        });
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
        return __awaiter(this, void 0, void 0, function* () {
            yield (this.sockets.map((socket) => socket.notify(event, payload)));
            return;
        });
    }
    registerSocket(ws, req) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    socket.profile = yield (this.options.authenticateSocket(req));
                }
                catch (error) {
                    return socket.close(error);
                }
            }
            this.emit("socket", socket);
            this.sockets.push(socket);
            socket.on("request", this.handleRequest.bind(this));
        });
    }
    handleRequest(request, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            debug("handling message from socket: %s", request.action);
            if (!this.options.handleRequest) {
                return socket.rejectRequest(request, new Error("NotImplemented"));
            }
            let result;
            try {
                result = yield (this.options.handleRequest(request, socket));
            }
            catch (error) {
                return socket.rejectRequest(request, error);
            }
            return socket.acceptRequest(request, result);
        });
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map