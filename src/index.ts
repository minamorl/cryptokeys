import fs from "fs"
import crypto from "crypto"

interface EncryptedFileConfig {
    algorithm: string
}

interface IEncryptionHandler {
    decrypt(source: string, key: string): string
    encrypt(source: string, key: string): string
}

class EncryptionHandler implements IEncryptionHandler {
    config: EncryptedFileConfig
    constructor(config?: EncryptedFileConfig) {
        const defaultConfig = {
            algorithm: 'aes-256-cbc',
        }
        this.config = Object.assign({}, defaultConfig, config)
    }
    decrypt(source: string, key: string): string {
        const [iv, encrypted] = source.split(":").map(v => Buffer.from(v, "hex"))
        const decipher = crypto.createDecipheriv(this.config.algorithm, Buffer.from(key, "hex"), iv)
        const decrypted = decipher.update(encrypted)
        return Buffer.concat([decrypted, decipher.final()]).toString()        
    }
    encrypt(source: string, key: string): string {
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(this.config.algorithm, Buffer.from(key, 'hex'), iv)
        const encrypted = cipher.update(source)
        return iv.toString("hex") + ":" + Buffer.concat([encrypted, cipher.final()]).toString("hex")
    }
}

class EncryptedFile {
    handler: IEncryptionHandler
    path: string
    key: string
    constructor(path: string, key: string, handler?: IEncryptionHandler) {
        this.path = path
        this.key = key
        this.handler = handler ?? new EncryptionHandler()
    }
    saveEnvValues(env: string, updateValues: Record<string, string>) {
        const parsed = JSON.parse(fs.readFileSync(this.path, "utf-8"))
        if (parsed[env]) {
            parsed[env] = this.handler.encrypt(
                JSON.stringify(Object.assign({}, JSON.parse(this.handler.decrypt(parsed[env], this.key)), updateValues)),
                this.key
            )
        } else {
            parsed[env] = this.handler.encrypt(
                JSON.stringify(updateValues),
                this.key
            )
        }
        fs.writeFileSync(this.path, JSON.stringify(parsed))
    }
    getEnvValues(env: string) {
        const parsed = JSON.parse(fs.readFileSync(this.path, "utf-8"))
        return JSON.parse(this.handler.decrypt(parsed[env], this.key))
    }
    getEnvNames(key: string): string[] {
        const parsed = JSON.parse(fs.readFileSync(this.path, "utf-8"))
        return Object.keys(parsed)
    }
}


function main(): void {
    const key = crypto.randomBytes(32).toString("hex");
    console.log(key)
    const file = new EncryptedFile("./test.enc", key)
    file.saveEnvValues("dev", {
        "test1": "test"
    })
    file.saveEnvValues("dev", {
        "test2": "test"
    })
    file.saveEnvValues("dev", {
        "test3": "test"
    })
    console.log(file.getEnvValues("dev"))
}

main()
