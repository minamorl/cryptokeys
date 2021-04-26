import crypto from "crypto"
import child_process from "child_process"

import { EncryptedFile } from "./index"
import { existsSync, fstat, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";


function main(): void {
    const key = crypto.randomBytes(32).toString("hex");
    console.log(key)
    const file = new EncryptedFile("./test.enc", key)
    file.saveEnvValues("dev", {
        "test1": "test",
        "test2": "test",
        "test3": "test",
    })
    if (!existsSync("./.cryptokeys")) {
        mkdirSync("./.cryptokeys")
    }
    writeFileSync("./.cryptokeys/.view.json", file.getEnvValues("dev"))

    let proc = "vim"
    if (process.env.EDITOR) {
        proc = process.env.EDITOR
    }
    const ps = child_process.spawn(proc, ["./.cryptokeys/.view.json"], {
        stdio: [process.stdin, process.stdout, process.stderr],
        detached: true,
    })
    
    ps.on('exit', (code) => {
        if (code !== 0) console.log(code)
        try {
            file.saveEnvValues("dev", JSON.parse(readFileSync("./.cryptokeys/.view.json", "utf-8")))
        } catch (e) {
            console.error(e)
        } finally {
            unlinkSync("./.cryptokeys/.view.json")
        }
    });
    
}

main()
