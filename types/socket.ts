/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * Socket component.
 */

// own modules
import Socket from "../lib/socket";
import * as base from "./base";

export interface IRequest {
    // ID of request.
    id: string;
    // Action to be executed.
    action: string;
    // Arguments for the action.
    args: base.IHash;
}

export { Socket };
