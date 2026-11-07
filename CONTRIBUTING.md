# Contributing

Thanks for helping improve rpc-foundations. Contributions of all sizes are welcome: bug reports, docs, tests and code.

## Before you start

- For a bug fix or small improvement, open an issue or go straight to a pull request.
- For a **new package or a breaking change**, open an RFC first (see [GOVERNANCE](GOVERNANCE.md)).
- Look for issues labeled `good first issue` or `help wanted`.

## Developer Certificate of Origin (DCO)

We use the [Developer Certificate of Origin](https://developercertificate.org/) instead of a CLA. By signing off,
you certify that you wrote the change or have the right to submit it under the project's license.

Add a sign-off to every commit:

```bash
git commit -s -m "fix(request-validation): reject empty field names"
```

This adds a line such as `Signed-off-by: Your Name <you@example.com>`. Contributions are accepted under the
Apache License 2.0 (inbound = outbound). CI checks every commit in a pull request for a sign-off.

## Development

```bash
corepack enable
pnpm install
pnpm test
pnpm typecheck
```

- Keep changes focused: one concern per pull request.
- Add or update tests; coverage thresholds must stay green.
- Update the package README when behavior changes.
- Use clear commit messages, for example `feat(api-docs): ...` or `fix(request-validation): ...`.

## Reviews

A maintainer reviews every pull request. We aim to respond within a week. Be kind and constructive; see the
[Code of Conduct](CODE_OF_CONDUCT.md).
