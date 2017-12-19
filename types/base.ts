/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 *
 * Base types.
 */


/**
 * Error class.
 */
export interface IError extends Error {
    code?: string;
    message: string;
}


/**
 * Basic key-value interface.
 */
export interface IHash {
    [key: string]: any;
}
