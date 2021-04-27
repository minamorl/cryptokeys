import crypto from "crypto"
import child_process from "child_process"

import minimist from "minimist"

import { EncryptedFile, EncryptionHandler } from "./index"
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";

const defaultPath = "./.cryptokeys/secrets.enc"

function openEncryptedFile(path: string, envName: string, key: string): void {
    const file = new EncryptedFile(path, key)
    writeFileSync("./.cryptokeys/.view.json", file.getEnvValues(envName))

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

function init(path: string): void {
    if (!existsSync("./.cryptokeys")) {
        mkdirSync("./.cryptokeys")
    }
    if (!existsSync(path)) {
        writeFileSync(path, "{}", "utf-8")
        return
    }
    throw Error(`Filepath ${path ?? defaultPath} is already existing. Abort.`)
}

function createEnv(envName: string, path: string): void {
    if (!existsSync(path ?? defaultPath)) {
        throw Error("Execute `cryptokeys --init` first. Abort.")        
    }
    const parsed: Record<string, string>= JSON.parse(readFileSync(path ?? defaultPath, "utf-8"))
    if (parsed[envName]) {
        throw Error(`Env name \`${envName}\` is already existing. Abort.`)
    }
    const key = crypto.randomBytes(32).toString("hex");
    console.log(key)
    parsed[envName] = new EncryptionHandler().encrypt("{}", key)
    writeFileSync(path ?? defaultPath, JSON.stringify(parsed), "utf-8")
}

function main(): void {
    const args = minimist(process.argv.slice(2))
    if (args._.find(v => v ==="init")) {
        init(args.path ?? defaultPath)
        return
    }
    if (args._.find(v => v ==="create")) {
        if (!args.name) {
            throw Error("Name should be given. Abort.")
        }
        createEnv(args.name, args.path ?? defaultPath)
        return
    }
    if (args._.find(v => v ==="open")) {
        console.log(args)
        if (args.name === undefined || args.key === undefined) {
            throw Error()
        }
        openEncryptedFile(args.path ?? defaultPath, args.name, args.key)        
    }    
}

main()
