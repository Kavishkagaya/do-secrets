# do-secrets

Encrypted, per-tenant secret storage for Cloudflare Workers, built on Durable Objects.

One Durable Object instance per id — team, user, project, any string you choose. Each
store's data is encrypted with a key deterministically derived from a single master
secret and the store's own id: physically isolated storage per tenant, no shared table,
no per-tenant key management.

## Quick start

`src/index.ts` — your Worker's entrypoint. Durable Object classes must be exported
from here, not just from wherever you define them:

```ts
import { SecretStore } from "do-secrets";

export class TeamSecrets extends SecretStore {}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const teamId = "team_123"; // from your own auth check — see Design below
    const store = env.TEAM_SECRETS.get(env.TEAM_SECRETS.idFromName(teamId));

    await store.putJSON("provider:google", { clientId, clientSecret });
    const config = await store.getJSON<{ clientId: string; clientSecret: string }>(
      "provider:google"
    );

    return Response.json(config);
  },
};
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
wrangler secret put DO_SECRET_MASTER_KEY   # required before first deploy — put/get
                                             # throw a clear error if this was skipped
wrangler deploy
```

## Usage

```ts
const store = env.TEAM_SECRETS.get(env.TEAM_SECRETS.idFromName(teamId));

// raw strings
await store.put("token", accessToken);
await store.get("token"); // string | null

// structured values — reaches for JSON.stringify/parse for you
await store.putJSON("provider:google", config);
await store.getJSON<Config>("provider:google"); // Config | null

await store.list("provider:"); // string[] of keys, values stay encrypted
await store.delete("provider:google");
await store.clear(); // wipes everything for this id
```

## Design

- **No auth.** The Durable Object binding is the trust boundary — whoever can reach
  `env.TEAM_SECRETS` in your Worker is authorized. Gate access in your own request
  handler before you compute an id; this library never sees or checks who's calling.
- **No key rotation.** One `DO_SECRET_MASTER_KEY`, forever. Losing it makes every
  store's data permanently unrecoverable — there is no fallback key version.
- **Cloudflare Workers only.** Built on Durable Objects and the Web Crypto API. Not
  portable to other runtimes.
