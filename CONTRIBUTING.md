# Contributing

This library is kept intentionally small — read the README's Design section before
proposing new surface area (auth, key rotation, config options). If your change adds
configurability, explain in the PR why `SecretStore` can't just be subclassed instead
(see README § Customizing) — that's free and usually already covers it.

## Local setup

```sh
bun install
bun test
bun run typecheck
```

## Making a change

1. Fork, branch from `master`.
2. `bun test` and `bun run build` must pass — CI checks both on every PR.
3. Open a PR against `master` with a short description of the "why."

## Releasing (maintainers)

Bump `version` in `package.json` and push/merge to `master`. The release workflow
diffs that version against what's live on npm — if it changed, it publishes and
cuts a matching GitHub release automatically. No separate tag or publish step.
