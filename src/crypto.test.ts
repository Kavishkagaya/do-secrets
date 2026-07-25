import { describe, expect, test } from "bun:test";
import { decrypt, deriveStoreKey, encrypt, importMasterKey } from "./crypto";

const MASTER_KEY = btoa(
  String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
);

describe("crypto", () => {
  test("round-trips a value", async () => {
    const master = await importMasterKey(MASTER_KEY);
    const key = await deriveStoreKey(master, "team-a");
    const encrypted = await encrypt("hello world", key);
    expect(await decrypt(encrypted, key)).toBe("hello world");
  });

  test("different store ids derive different keys", async () => {
    const master = await importMasterKey(MASTER_KEY);
    const keyA = await deriveStoreKey(master, "team-a");
    const keyB = await deriveStoreKey(master, "team-b");
    const encrypted = await encrypt("secret", keyA);
    await expect(decrypt(encrypted, keyB)).rejects.toThrow();
  });

  test("same store id deterministically re-derives the same key", async () => {
    const master = await importMasterKey(MASTER_KEY);
    const keyA1 = await deriveStoreKey(master, "team-a");
    const keyA2 = await deriveStoreKey(master, "team-a");
    const encrypted = await encrypt("secret", keyA1);
    expect(await decrypt(encrypted, keyA2)).toBe("secret");
  });

  test("two encryptions of the same value produce different ciphertext", async () => {
    const master = await importMasterKey(MASTER_KEY);
    const key = await deriveStoreKey(master, "team-a");
    const first = await encrypt("secret", key);
    const second = await encrypt("secret", key);
    expect(first).not.toBe(second); // random nonce per call
  });
});
