import { DurableObject } from "cloudflare:workers";
import { decrypt, deriveStoreKey, encrypt, importMasterKey } from "./crypto.js";

export interface SecretStoreEnv {
  MASTER_KEY: string;
}

/**
 * One instance per id (`idFromName(id)`) — physically isolated, encrypted
 * key/value storage. The encryption key is deterministically derived from
 * MASTER_KEY + this instance's id, so nothing about a specific store's key
 * is ever persisted.
 */
export class SecretStore<
  Env extends SecretStoreEnv = SecretStoreEnv,
> extends DurableObject<Env> {
  #keyPromise?: Promise<CryptoKey>;

  private storeKey(): Promise<CryptoKey> {
    this.#keyPromise ??= (async () => {
      const storeId = this.ctx.id.name;
      if (!storeId) {
        throw new Error("SecretStore must be addressed via idFromName(id)");
      }
      const master = await importMasterKey(this.env.MASTER_KEY);
      return deriveStoreKey(master, storeId);
    })();
    return this.#keyPromise;
  }

  async put(key: string, value: string): Promise<void> {
    const encrypted = await encrypt(value, await this.storeKey());
    await this.ctx.storage.put(key, encrypted);
  }

  async get(key: string): Promise<string | null> {
    const encrypted = await this.ctx.storage.get<string>(key);
    return encrypted ? decrypt(encrypted, await this.storeKey()) : null;
  }

  async delete(key: string): Promise<void> {
    await this.ctx.storage.delete(key);
  }

  async list(prefix = ""): Promise<string[]> {
    const entries = await this.ctx.storage.list({ prefix });
    return [...entries.keys()];
  }

  /** Wipes every key in this store. */
  async clear(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
