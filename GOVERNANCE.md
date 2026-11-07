# Governance

## Roles

- **Contributors**: anyone who opens issues, reviews or submits changes.
- **Maintainers**: review and merge pull requests, triage issues and cut releases. Current maintainers are listed
  in [MAINTAINERS.md](MAINTAINERS.md).
- **Lead maintainer**: RuhlinIT LLC, which started the project, holds the final decision when maintainers can't
  reach consensus, and manages releases and trademarks.

## Becoming a maintainer

Contributors with a record of sustained, high-quality contributions and reviews can be nominated by a maintainer.
Nominations are discussed in public and accepted when no maintainer objects within 7 days.

## Decisions

- Day-to-day changes: one maintainer approval and green CI.
- **RFCs** are required for new packages, breaking changes and changes to these rules:
  1. Open an issue with the RFC template.
  2. Discussion stays open for at least 7 days.
  3. Maintainers record the decision (accepted, declined or postponed) and the reasoning in the issue.
- Decisions are made in public, in issues and pull requests.

## Releases

Semantic versioning. Releases are cut by maintainers; each lists changes and credits contributors.

## Scope

rpc-foundations contains generic, provider-neutral building blocks with no business logic. Product features,
hosted services and brand assets are out of scope.
