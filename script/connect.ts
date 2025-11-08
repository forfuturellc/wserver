/**
 * Copyright (c) 2017 Forfuture, LLC (https://forfuture.tech)
 */

// built-in modules
import * as repl from "repl";

// installed modules
import { Command } from "commander";

// own modules
import { Client } from "../lib";
const pkg = require("../../package.json");
const program = new Command();

// module variables
let r: repl.REPLServer; // the REPL instance
let client: Client; // the WebSocket instance
let uri: string | undefined; // URI to wserver instance

program
    .version(pkg.version)
    .usage("[options] <uri>")
    .argument("<uri>")
    .parse(process.argv);

uri = program.args.shift();
if (!uri) {
    console.error("error: URI missing");
    process.exit(1);
}

client = new Client(uri);

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

const evalCmd = async function (cmd, context, filename, callback) {
    if (!cmd) {
        return callback();
    }

    cmd = cmd.trim();
    if (cmd[0] === "!") {
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
        let val: string | number | boolean = match[2];
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
        const result = await client.request(action, params);
        console.log(result);
    } catch (error) {
        console.error("ERROR:", JSON.stringify(error, null, 4));
    }
    return callback();
};
