"use strict";
/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * WebSocket.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// built-in modules
const assert = require("assert");
const EventEmitter = require("events");
// installed modules
const Debug = require("debug");
// module variables
const debug = Debug("@forfuture/wserver:socket");
const noop = () => true;
class Socket extends EventEmitter {
    constructor(ws) {
        super();
        this.ws = ws;
        this.isAlive = true;
        this.ws.on("pong", () => {
            this.isAlive = true;
        });
        this.ws.on("message", (message) => {
            message = message.toString();
            let request;
            try {
                request = JSON.parse(message);
                request.args = request.args || {};
                assert.equal("string", typeof request.id, "request.id must be a string");
                assert.equal("string", typeof request.action, "request.action must be a string");
            }
            catch (ex) {
                const error = new TypeError("bad request");
                return this.error(error).catch(noop);
            }
            return this.emit("request", request, this);
        });
        this.ws.on("close", () => {
            this.isAlive = false;
        });
    }
    close(code) {
        if (this.ws.readyState === this.ws.CLOSED) {
            return Promise.resolve();
        }
        let resolve;
        let reject;
        const promise = new Promise((a, b) => {
            resolve = a;
            reject = b;
        });
        let error;
        this.ws.on("close", () => {
            error ? reject(error) : resolve();
        });
        if (!(code instanceof Error)) {
            this.ws.close(code);
        }
        else {
            this.error(code).catch((e) => {
                debug("errored sending error before closing:", e);
                error = e;
            }).then(() => {
                if (this.ws.readyState !== this.ws.CLOSED) {
                    this.ws.close(4001);
                }
            });
        }
        return promise;
    }
    ping() {
        this.isAlive = false;
        this.ws.ping("", false, true);
    }
    send(message) {
        message = stringify(message);
        return new Promise((resolve, reject) => {
            return this.ws.send(message, (error) => error ? reject(error) : resolve());
        });
    }
    error(error, request) {
        const message = {
            error: {
                code: error.code || 500,
                message: error.message,
            },
        };
        if (request) {
            message.requestId = request.id;
        }
        return this.send(message);
    }
    acceptRequest(request, body) {
        return this.send({
            requestId: request.id,
            result: body,
        });
    }
    rejectRequest(request, error) {
        return this.error(error, request);
    }
    notify(event, payload) {
        return this.send({
            event,
            payload,
        });
    }
}
function stringify(data) {
    if (typeof data === "string") {
        return data;
    }
    return JSON.stringify(data);
}
exports.default = Socket;
//# sourceMappingURL=socket.js.map