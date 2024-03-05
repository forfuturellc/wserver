"use strict";
/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
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
/* tslint:disable: no-console */
// built-in modules
const repl = require("repl");
// installed modules
const commander_1 = require("commander");
// own modules
const lib_1 = require("../lib");
// tslint:disable-next-line:no-var-requires
const pkg = require("../../package.json");
const program = new commander_1.Command();
// module variables
let r; // the REPL instance
let client; // the WebSocket instance
let uri; // URI to wserver instance
program
    .version(pkg.version)
    .usage("[options] <uri>")
    .parse(process.argv);
uri = program.args.shift();
if (!uri) {
    console.error("error: URI missing");
    process.exit(1);
}
client = new lib_1.Client(uri);
client.on("error", function (error) {
    console.log("[*] Socket error:", JSON.stringify(error, null, 4));
    client.close();
});
client.on("open", function () {
    console.log("[*] Socket connected. Starting REPL.");
    r = repl.start({
        prompt: "> ",
        eval: evalCmd,
    });
    r.on("exit", function () {
        if (client.isOpen) {
            console.log("");
        }
        console.log("[*] Goodbye.");
        process.exit();
    });
});
client.on("close", function (ok, desc) {
    if (r) {
        console.log("\n[*] Socket closed. Exiting REPL.");
        r.close();
    }
});
const evalCmd = function (cmd, context, filename, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!cmd) {
            return callback();
        }
        cmd = cmd.trim();
        if (cmd[0] === "!") {
            // tslint:disable-next-line:no-eval
            console.log(eval(cmd.slice(1)));
            return callback();
        }
        const args = cmd.split(" ").filter(Boolean);
        const action = args.shift();
        const params = {};
        for (const arg of args) {
            const match = /(.*)=(.*)/.exec(arg);
            if (!match) {
                return callback(new Error(`unparseable arg: ${arg}`));
            }
            let val = match[2];
            const num = Number(val);
            if (!Number.isNaN(num)) {
                val = num;
            }
            const bool = (val === "true" && val) || (val === "false" && val) || "";
            if (bool) {
                val = val[0] === "t" ? true : false;
            }
            params[match[1]] = val;
        }
        try {
            const result = yield (client.request(action, params));
            console.log(result);
        }
        catch (error) {
            console.error("ERROR:", JSON.stringify(error, null, 4));
        }
        return callback();
    });
};
//# sourceMappingURL=connect.js.map