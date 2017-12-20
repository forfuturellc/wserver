/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 */


// built-in modules
import * as assert from "assert";
import * as EventEmitter from "events";


// installed modules
import * as Debug from "debug";
import * as uuid from "uuid";
import * as WebSocket from "ws";


// own modules
import * as constants from "./constants";
import * as utils from "./utils";
import * as types from "../types";


// module variables
const debug = Debug("@forfuture/wserver:client");


class Client extends EventEmitter {
    public uri: string;
    private ws: WebSocket;
    private promises: {
        [key: string]: { resolve: (data) => void, reject: (error) => void },
    } = {};

    constructor(uri: string) {
        super();
        this.uri = uri;
        this.ws = new WebSocket(uri);

        this.ws.on("error", (error) => this.emit("error", error));
        this.ws.on("open", () => this.emit("open"));
        this.ws.on("message", this.handleMessage.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
    }

    public close(): Promise<void> {
        return new Promise((resolve) => {
            this.once("close", resolve);
            this.ws.close(constants.WEBSOCKET_CLOSE_CODES.OK);
        });
    }

    public request(action: string, args?: types.IHash): Promise<any> {
        const message = {
            id: uuid.v4(),
            action,
        } as any;
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

    private handleMessage(data: string) {
        let message;
        try {
            message = JSON.parse(data);
        } catch (error) {
            debug("error parsing message from server");
            return this.emit("parse_error", error);
        }
        if (message.event) {
            try {
                assert.ok(utils.isDefined(message.payload), "Message payload missing");
            } catch (error) {
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
        } catch (error) {
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

    private handleClose(code: number, reason: string) {
        const ok = code === constants.WEBSOCKET_CLOSE_CODES.OK;
        const desc = { code, reason };
        this.emit("close", ok, desc);
    }
}


export default Client;
