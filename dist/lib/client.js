"use strict";
/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 */
Object.defineProperty(exports, "__esModule", { value: true });
// built-in modules
const assert = require("assert");
const EventEmitter = require("events");
// installed modules
const Debug = require("debug");
const uuid = require("uuid");
const WebSocket = require("ws");
// own modules
const constants = require("./constants");
const utils = require("./utils");
// module variables
const debug = Debug("@forfuture/wserver:client");
class Client extends EventEmitter {
    constructor(uri) {
        super();
        this.promises = {};
        this.uri = uri;
        this.ws = new WebSocket(uri);
        this.ws.on("error", (error) => this.emit("error", error));
        this.ws.on("open", () => this.emit("open"));
        this.ws.on("message", this.handleMessage.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
    }
    close() {
        return new Promise((resolve) => {
            this.once("close", resolve);
            this.ws.close(constants.WEBSOCKET_CLOSE_CODES.OK);
        });
    }
    get isOpen() {
        return this.ws.OPEN === this.ws.readyState;
    }
    request(action, args) {
        const message = {
            id: uuid.v4(),
            action,
        };
        if (args) {
            message.args = args;
        }
        let resolve;
        let reject;
        const promise = new Promise((a, b) => {
            resolve = a;
            reject = b;
        });
        this.ws.send(JSON.stringify(message), (error) => {
            if (error) {
                return reject(error);
            }
            this.promises[message.id] = { resolve, reject };
        });
        return promise;
    }
    handleMessage(data) {
        let message;
        try {
            message = JSON.parse(data);
        }
        catch (error) {
            debug("error parsing message from server");
            return this.emit("parse_error", error);
        }
        if (message.event) {
            try {
                assert.ok(utils.isDefined(message.payload), "Message payload missing");
            }
            catch (error) {
                debug(error);
                return this.emit("parse_error", error);
            }
            return this.emit(message.event, message.payload);
        }
        try {
            // TODO: improve assertion. Use protocol buffers?
            const hasResult = utils.isDefined(message.result);
            const hasError = utils.isDefined(message.error);
            assert.ok(hasResult || hasError, "Message result and error both missing");
            assert.ok(!(hasResult && hasError), "Message result and error both provided");
            if (hasResult) {
                assert.ok(message.requestId, "Message requestId missing");
            }
        }
        catch (error) {
            debug(error);
            return this.emit("parse_error", error);
        }
        const promise = message.requestId ? this.promises[message.requestId] : null;
        delete this.promises[message.requestId];
        if (message.error) {
            if (!promise) {
                return this.emit("error", message.error);
            }
            return promise.reject(message.error);
        }
        return promise.resolve(message.result);
    }
    handleClose(code, reason) {
        const ok = code === constants.WEBSOCKET_CLOSE_CODES.OK;
        const desc = { code, reason };
        this.emit("close", ok, desc);
    }
}
exports.default = Client;
//# sourceMappingURL=client.js.map