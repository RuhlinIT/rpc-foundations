# @rpc-foundations/request-validation

## Purpose

`request-validation` provides small, dependency-free runtime validation for JSON request bodies,
plus a NestJS pipe that turns validation failures into a consistent `400` response.

It provides:

- `validateStrictObject(body, rules)`: rejects non-object bodies and unknown fields, checks listed
  fields, and returns an explicit projection containing only the listed fields that were present
- value rules: `stringValue`, `booleanValue`, `int32Value`, `oneOf`, `stringArray`, `stringMap`
- `required(...)` / `optional(...)` field wrappers
- `exhaustiveValues<T>()`: compile-time check that a runtime value list covers a string union
- `ValidatedBodyPipe`: NestJS adapter for a validation function

It is deliberately not a general-purpose schema language.

## Install

```bash
pnpm add @rpc-foundations/request-validation
```

`@nestjs/common` is a peer dependency (only needed for `ValidatedBodyPipe`).

## Behavior

- No coercion, trimming or defaults. Omitted optional fields stay omitted.
- `null` is always rejected by the current rules.
- `int32Value` requires a finite integer within the PostgreSQL `integer` range.
- `stringMap` keys are caller-defined; the copy has a null prototype and is populated with
  `Object.defineProperty`, so keys such as `__proto__` never modify a prototype.
- Errors are `{ field, message }` and never include submitted values or submitted key names.
  Unexpected fields are reported as one `(body)` error with a count; `stringMap` entry errors are
  identified by position (`entry 2 must be a string`).

Failure response from `ValidatedBodyPipe`:

```json
{
  "statusCode": 400,
  "message": "Invalid request body",
  "errors": [{ "field": "reviewStatus", "message": "is required" }]
}
```

## Ownership Boundary

This library validates request shape and primitive types only. Authorization, URL/destination
policy for outbound fetching, length limits and business rules (such as score ranges) belong
elsewhere.

## Tests

```bash
pnpm --filter @rpc-foundations/request-validation test
```

## License

Apache-2.0
