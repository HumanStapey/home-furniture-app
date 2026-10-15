# AI Usage

OpenAI Codex supports requirements analysis, architecture evaluation and documentation. Final decisions, code understanding and verification remain the developer's responsibility.

## Scope of assistance

AI assistance has covered reviewing the technical brief, inspecting the repository, checking official framework documentation and preparing an incremental implementation plan. TypeORM, RTK Query and Nginx were treated as fixed technical choices.

The working approach is to compare requirements with documented capabilities, identify trade-offs and define a verification step for each contribution. AI also drafted the README and this record.

## Architectural decisions

- **Next.js with React Router:** a statically exported SPA preserves the selected framework and the challenge's routing requirements. Vite was evaluated as an alternative and not selected.
- **Client-side catalogue:** React Server Components were evaluated and excluded from product rendering. They are not required by the challenge, and a client-side catalogue fits RTK Query and static hosting with Nginx. Products will not appear in the initial HTML, limiting search engine visibility without JavaScript execution.
- **Local persistence:** Fake Store API is an import source. Normal catalogue requests must read from the application's database through NestJS rather than depend on the external service.
- **Shared contracts:** a workspace package is proposed for product, category and API types, separate from persistence entities and validation DTOs.

PostgreSQL and a dedicated seed command remain proposals. The database and import strategy have not been selected.

## Verification and limits

Planning was checked against the supplied PDF and official documentation for [Next.js SPA migration](https://nextjs.org/docs/app/guides/migrating/from-vite), [static exports](https://nextjs.org/docs/app/guides/static-exports) and [RTK Query caching](https://redux-toolkit.js.org/rtk-query/usage/cache-behavior).

Work is limited to planning and documentation. No application code, dependency installation, builds, tests or container execution have been performed. Runtime behaviour remains to be verified during implementation.

This record will be updated as code is developed, including accepted or rejected suggestions and the checks used to validate them.
