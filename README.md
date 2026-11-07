# rpc-foundations

Small, well-tested building blocks for NestJS and TypeScript services, released under the
[Apache License 2.0](LICENSE) and built in the open with the community.

| Package | What it does | Tests |
|---|---|---|
| [`@rpc-foundations/request-validation`](packages/request-validation) | Strict, dependency-free runtime validation for JSON request bodies, plus a NestJS pipe that returns a consistent `400` | 35 |
| [`@rpc-foundations/api-docs`](packages/api-docs) | Protected, read-only OpenAPI documentation for NestJS without `SwaggerModule.setup` or static-file middleware | 70, 100% coverage |

Status: **0.x, pre-release.** Packages are not yet published to npm; APIs may change before 1.0.

## Quick start

```bash
corepack enable
pnpm install
pnpm test        # all packages, with coverage thresholds
pnpm typecheck
pnpm build
```

Requires Node.js 20 or later and pnpm 10.

## Principles

- **Small and explicit.** Each package does one job, with no hidden behavior and no coercion.
- **Fail closed.** Invalid input and misconfiguration are refused, never guessed at.
- **Tested.** Coverage thresholds are enforced in CI.
- **No business logic.** Packages are generic building blocks; authorization and product rules stay in your app.

## Community

- Read [CONTRIBUTING](CONTRIBUTING.md) (every commit needs a DCO `Signed-off-by` line).
- We follow the [Contributor Covenant 3.0](CODE_OF_CONDUCT.md).
- How decisions are made: [GOVERNANCE](GOVERNANCE.md). New packages and breaking changes start as an RFC.
- What's next: [ROADMAP](ROADMAP.md).
- Report security issues privately: [SECURITY](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). The license does not grant trademark rights.
