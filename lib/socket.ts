/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * WebSocket.
 */


// built-in modules
import * as assert from "assert";
import * as EventEmitter from "events";


// installed modules
import * as Debug from "debug";
import * as WebSocket from "ws";


// own modules
import * as constants from "./constants";
import * as types from "../types";


// module variables
const debug = Debug("@forfuture/wserver:socket");
const noop = () => true;


class Socket extends EventEmitter {
    public isAlive = true;
    public profile: types.IHash;

    constructor(public ws: WebSocket, public options: {
        ignoreConnReset: boolean;
    }) {
        super();
        this.ws.on("error", this.handleError.bind(this));
        this.ws.on("pong", () => {
            this.isAlive = true;
        });
        this.ws.on("message", (message) => {
            message = message.toString();
            let request: types.ISocket.IRequest;
            try {
                request = JSON.parse(message);
                request.args = request.args || {};
                assert.equal("string", typeof request.id, "request.id must be a string");
                assert.equal("string", typeof request.action, "request.action must be a string");
            } catch (ex) {
                const error = new TypeError("bad request");
                return this.error(error).catch(noop);
            }
            return this.emit("request", request, this);
        });
        this.ws.on("close", () => {
            this.isAlive = false;
        });
    }

    public close(code: number|types.IError): Promise<void> {
        if (this.ws.readyState === this.ws.CLOSED) {
            return Promise.resolve();
        }
        let resolve;
        let reject;
        const promise = new Promise<void>((a, b) => {
            resolve = a;
            reject = b;
        });
        let error;
        this.ws.on("close", () => {
            error ? reject(error) : resolve();
        });
        if (!(code instanceof Error)) {
            this.ws.close(code);
        } else {
            this.error(code).catch((e) => {
                debug("errored sending error before closing:", e);
                error = e;
            }).then(() => {
                if (this.ws.readyState !== this.ws.CLOSED) {
                    this.ws.close(constants.WEBSOCKET_CLOSE_CODES.APPLICATION_ERROR);
                }
            });
        }
        return promise;
    }

    public ping() {
        this.isAlive = false;
        this.ws.ping("", false, true);
    }

    public send(message: types.IHash|string): Promise<void> {
        message = stringify(message);
        return new Promise((resolve, reject) => {
            return this.ws.send(message, (error) => error ? reject(error) : resolve());
        });
    }

    public error(error: types.IError, request?: types.ISocket.IRequest): Promise<void> {
        const message = {
            error: {
                code: error.code || 500,
                message: error.message,
            },
        } as any;
        if (request) {
            message.requestId = request.id;
        }
        return this.send(message);
    }

    public acceptRequest(request: types.ISocket.IRequest, body: types.IHash): Promise<void> {
        return this.send({
            requestId: request.id,
            result: body,
        });
    }

    public rejectRequest(request: types.ISocket.IRequest, error: types.IError): Promise<void> {
        return this.error(error, request);
    }

    public notify(event: string, payload: types.IHash|string): Promise<void> {
        return this.send({
            event,
            payload,
        });
    }

    private handleError(error: Error|NodeJS.ErrnoException) {
        if ((error as NodeJS.ErrnoException).code === "ECONNRESET" && this.options.ignoreConnReset) {
            debug("connection reset by client");
            this.ws.terminate();
            this.emit("connection_reset", error);
            return;
        }
        this.emit("error", error);
    }
}


function stringify(data: types.IHash|string) {
    if (typeof data === "string") {
        return data;
    }
    return JSON.stringify(data);
}


export default Socket;
