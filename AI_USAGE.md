# AI Usage

OpenAI Codex supports requirements analysis, architecture evaluation and documentation. Final decisions, code understanding and verification remain the developer's responsibility.

## Scope of assistance

AI assistance has covered reviewing the technical brief, inspecting the repository, checking official framework documentation and preparing an incremental implementation plan. TypeORM, RTK Query and Nginx were treated as fixed technical choices.

The working approach is to compare requirements with documented capabilities, identify trade-offs and define a verification step for each contribution. AI also drafted the README and this record.

## Architectural decisions

- **Next.js with React Router:** a statically exported SPA preserves the selected framework and the challenge's routing requirements. Vite was evaluated as an alternative and not selected.
- **Client-side catalogue:** React Server Components were evaluated and excluded from product rendering. They are not required by the challenge, and a client-side catalogue fits RTK Query and static hosting with Nginx. Products will not appear in the initial HTML, limiting search engine visibility without JavaScript execution.
- **Local persistence:** Fake Store API is an import source. Normal catalogue requests must read from the application's database through NestJS rather than depend on the external service.
- **Shared contracts:** the developer chose to retain `packages/contracts` after considering local type definitions, to reduce duplication and keep catalogue API types consistent. This is a project design choice, not a challenge requirement. The package will contain only framework-independent TypeScript types used by both applications: products, categories, catalogue query parameters, paginated responses and API errors. Cart types will remain in the frontend; database entities, Fake Store import types and runtime validation DTOs will remain in the backend. Runtime validation is still required at data boundaries.
- **Shopping cart:** an extra beyond the challenge's core scope. It will share the Redux Toolkit store used by RTK Query, with quantity controls, item removal, totals and `localStorage` persistence. Verification will cover totals, quantity validation and recovery from invalid stored data.

PostgreSQL is selected. The agreed import policy inserts new products, updates changed values and retains products absent from upstream responses. Imports will validate the full batch, write transactionally and retry failed startup attempts while the API serves any existing local catalogue. This behaviour remains to be implemented.

## Verification and limits

Planning was checked against the supplied PDF and official documentation for [Next.js SPA migration](https://nextjs.org/docs/app/guides/migrating/from-vite), [static exports](https://nextjs.org/docs/app/guides/static-exports) and [RTK Query caching](https://redux-toolkit.js.org/rtk-query/usage/cache-behavior).

Codex created the initial [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/) configuration: private packages for the frontend, backend and shared contracts, a root lockfile and a minimal `.gitignore`. An offline npm installation completed, and `npm ls --workspaces --depth=0` confirmed all three local package links. That initial step added no external dependencies.

Framework setup added Next.js, React, React Router and NestJS with minimal startup code, development commands and strict TypeScript configuration. The frontend uses the documented client-only SPA entry point and static export; the backend exposes a simple API root. No catalogue or cart behaviour was generated.

`npm run build` passed for both applications and produced the frontend static export and backend JavaScript. Both development commands started successfully, and browser checks confirmed the initial screen and API response. Local connection checks required running the verification servers outside the sandbox.

The shared package now exports `Product`, `Category`, `ProductsQuery`, `ProductsResponse` and `ApiError`. `CartItem` stays in the frontend and imports `Product`. Product prices retain the source's numeric representation, categories remain strings, and the query contract limits sorting to supported fields. Runtime input validation remains a backend responsibility.

`npm run typecheck` passed across all three workspaces. Temporary consumer fixtures verified imports from both applications and rejection of invalid identifier, pagination, sorting, quantity and null assignments. These checks exercise TypeScript contracts, not runtime API or cart behaviour.

Database setup added the official `postgres:18.6-alpine3.24` image, a named volume mounted at the PostgreSQL 18 data location, a TCP readiness check and local-only port publishing. `.env.example` documents development settings, and a local `.env` was created outside version control. Port `15432` was selected after Windows rejected publishing `5432`.

`docker-compose config --quiet` passed. An authenticated SQL write and read survived container recreation, the published local port accepted connections, and the disposable verification table was removed. The database container finished healthy. The volume configuration was checked against the [official PostgreSQL image documentation](https://hub.docker.com/_/postgres).

TypeORM integration added a shared PostgreSQL configuration for NestJS and the migration CLI. The selected NestJS adapter supports TypeORM 0.3. Node.js 22 loads the root `.env` through its native API, avoiding an additional configuration dependency. Required settings and port ranges are validated without including credentials in error messages. Automatic schema synchronization and migration execution are disabled.

Nine configuration tests passed using Node.js's built-in test runner, and strict type checks passed across all workspaces. Live checks confirmed authenticated database access, the API root response, unchanged public tables and CLI configuration loading from the backend directory. Startup checks also verified rejection of missing configuration and an unavailable database. The connection-error check was adjusted to inspect Node.js's aggregate error codes, whose top-level message can be empty.

AI assistance defined the product entity and registered it in the shared connection configuration. Prices remain decimal strings in persistence, separate from the numeric public contract. Ratings use separate columns; database constraints enforce identifiers, required fields and value ranges. No timestamps, additional tables or generated identifiers were added.

An integration test was written before the entity and first failed because the entity did not exist. It then passed against PostgreSQL, checking exact price round trips, boundary values and specific database errors for invalid records. The test creates its schema inside a transaction and rolls it back. The distinction between exact decimal storage and PostgreSQL's rounding of excess fractional digits was checked against the [PostgreSQL numeric documentation](https://www.postgresql.org/docs/18/datatype-numeric.html); import precision validation remains pending.

Migrations, seed, RTK Query, cart behaviour and Docker packaging for the applications remain pending. The current connection settings target local development; production TLS configuration remains outside this step.

This record will be updated as code is developed, including accepted or rejected suggestions and the checks used to validate them.
