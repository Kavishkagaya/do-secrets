# do-secrets

Encrypted, per-tenant secret storage for Cloudflare Workers, built on Durable Objects.

One Durable Object instance per id — team, user, project, any string you choose. Each
store's data is encrypted with a key deterministically derived from a single master
secret and the store's own id: physically isolated storage per tenant, no shared table,
no per-tenant key management.

## Setup

```ts
import { SecretStore } from "do-secrets";

export class TeamSecrets extends SecretStore {}
```

```toml
# wrangler.toml
[[durable_objects.bindings]]
name = "TEAM_SECRETS"
class_name = "TeamSecrets"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["TeamSecrets"]
```

```sh
wrangler secret put MASTER_KEY
```

## Usage

```ts
const store = env.TEAM_SECRETS.get(env.TEAM_SECRETS.idFromName(teamId));

await store.put("provider:google", JSON.stringify(config));
await store.get("provider:google"); // string | null
await store.list("provider:"); // string[]
await store.delete("provider:google");
await store.clear(); // wipes everything for this id
```

## Design

- **No auth.** The Durable Object binding is the trust boundary — whoever can reach
  `env.TEAM_SECRETS` in your Worker is authorized. Gate access in your own request
  handler before you compute an id; this library never sees or checks who's calling.
- **No key rotation.** One `MASTER_KEY`, forever. Losing it makes every store's data
  permanently unrecoverable — there is no fallback key version.
- **Cloudflare Workers only.** Built on Durable Objects and the Web Crypto API. Not
  portable to other runtimes.
