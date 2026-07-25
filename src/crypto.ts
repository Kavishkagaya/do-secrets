const IV_BYTES = 12;

/** Imports a base64-encoded master key as HKDF input key material. */
export function importMasterKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
}

/** Deterministically derives a per-store AES-256-GCM key from the master key + store id. */
export function deriveStoreKey(
  masterKey: CryptoKey,
  storeId: string
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: new TextEncoder().encode(storeId),
    },
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypts plaintext with a fresh random nonce, packing iv + ciphertext together. */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext)
    )
  );
  const packed = new Uint8Array(IV_BYTES + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, IV_BYTES);
  return btoa(String.fromCharCode(...packed));
}

/** Decrypts a value produced by `encrypt`. */
export async function decrypt(packedBase64: string, key: CryptoKey): Promise<string> {
  const packed = Uint8Array.from(atob(packedBase64), (c) => c.charCodeAt(0));
  const iv = packed.slice(0, IV_BYTES);
  const ciphertext = packed.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}
