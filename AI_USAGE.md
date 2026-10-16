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

Codex used the installed TypeORM CLI to generate the initial product migration from entity metadata, then formatted the SQL for review. The migration contains a fixed schema definition independent of future entity changes. Shared configuration explicitly registers it and uses transactional execution. Root and backend commands compile the source before showing, applying or reverting migrations; automatic execution at application startup remains disabled.

The integration test now uses TypeORM's migration executor rather than creating a table directly from entity metadata. It checks application, repeated execution without changes, storage constraints, reversal and reapplication inside a disposable transaction. The initial migration was also applied to the local database through the root command. Reversal deletes the product table and its data, so reversal checks use only the temporary test schema.

Codex implemented the shared seed flow: native `fetch` with a ten-second HTTP deadline, nested DTO validation using `class-validator` and `class-transformer`, exact decimal mapping and transactional PostgreSQL upserts that skip unchanged rows. Startup imports run in the background, retry 60 seconds after failure and stop after success. A separate command reuses the importer for a single manual attempt. Shutdown cancels HTTP requests and timers before database connections close.

Validation tests exposed an exception in `class-validator`'s decimal-place option for exponent-form numbers such as `1e-7`. The implementation instead validates a finite number and checks that conversion to two decimal places preserves its value before constructing the decimal string. Empty batches, duplicate IDs, invalid nested ratings and implicit string-to-number coercion are rejected; unknown source fields are ignored.

Tests cover invalid external responses, mapping, retry timing, cancellation and stopping after success. PostgreSQL integration checks cover insertion, updates, retained absent products, unchanged row versions and preservation after validation or write failures. A real NestJS startup check confirms the API responds while import is pending. The manual command successfully imported 20 products from the real Fake Store API. Test HTTP boundaries are controlled so automated verification does not depend on the external service; retry tests use Node.js's experimental mock timers.

API implementation added catalogue, categories and detail endpoints over the existing repository. Codex kept the shared response contracts and separated persistence entities from HTTP models, converting decimal strings to numeric prices and restoring nested ratings. Query defaults are page 1, limit 12 and ascending ID, with a maximum page size of 100. Search is literal and case-insensitive, category matches exactly and ID breaks sorting ties.

Global validation rejects unsupported parameters and malformed IDs, pagination or sort values. The exception filter preserves the shared error shape, distinguishes an empty catalogue (`503`) from no matching results (`200`) or a missing product (`404`), and masks unexpected errors (`500`). Swagger documents parameters, response DTOs and errors. Framework integration was checked against the official NestJS documentation for [validation](https://docs.nestjs.com/techniques/validation), [exception filters](https://docs.nestjs.com/exception-filters) and [OpenAPI](https://docs.nestjs.com/openapi/introduction).

An HTTP integration test was written before implementation and exercises NestJS with the production request configuration and a temporary PostgreSQL schema. It covers combined filters, exact API shapes, numeric price sorting, stable pagination, literal search characters, invalid inputs, error responses and Swagger schemas. Upstream requests are controlled in tests to confirm catalogue reads use local data even when Fake Store is unavailable.

Codex initially implemented the client catalogue with React Router, Redux Toolkit and RTK Query, using the shared API contracts. That initial interface used Spanish labels and messages, native CSS and a restrained white, blue and yellow palette; its presentation was subsequently migrated to MUI as described below. Product content remains unchanged; USD is an explicit presentation assumption without conversion. Product details and cart behaviour were separate steps.

URL parameters hold search, category, sorting and pagination, with validation before requests and replacement of malformed links. Search is submitted explicitly; filter and sort changes reset the page. RTK Query distinguishes current-query results from previous-query data, provides caching, refreshes stale queries on revisits and reconnects, and exposes retry actions. Loading skeletons, empty results, independent category failures and unavailable-image fallbacks are implemented.

Next.js development forwards `/api` to NestJS, while production still builds static files. `/products` was added to static route generation. The installed Next.js documentation was read before editing, and the request/cache behaviour was checked against [RTK Query](https://redux-toolkit.js.org/rtk-query/usage/queries) and [React Router search parameters](https://reactrouter.com/api/hooks/useSearchParams).

Playwright tests were added before the catalogue implementation. Five flows run in desktop and mobile Chromium: filter/pagination history, search and reset, loading and 503 recovery, malformed links and category failure, and prevention of previous-query results appearing under new filters. The browser test's error assertion was scoped to the catalogue because Next.js includes its own accessible route announcer. Type checks and the production static build passed, and a live browser check confirmed the 20-product catalogue and a six-product electronics filter through the development proxy.

Codex added the product detail route `/product/:id`, catalogue links and a typed `getProduct` endpoint in the existing RTK Query API. The page uses the shared `Product` contract and displays the full imported content with the catalogue's existing visual style, currency and rating formatters. Catalogue navigation state preserves filters and pagination on return. No backend, database or dependency changes were required for this feature.

ID validation skips malformed or out-of-range requests. Loading, 404, temporary unavailability and network errors have separate states; retry uses the existing query. Failed refreshes hide cached details, and broken images have a fallback. Keyboard navigation, main-content focus and responsive layout are covered by browser checks. The approach follows the documented [RTK Query current-query data and conditional fetching](https://redux-toolkit.js.org/rtk-query/usage/queries) and [React Router link state](https://reactrouter.com/api/components/Link).

The first detail browser test failed before implementation because catalogue cards had no product links. Nine new flows then passed on desktop and mobile Chromium (18 cases), covering navigation and catalogue return, direct development URLs and reloads, image fallback, loading, missing products, 503/500/network recovery, invalid IDs and a cached product becoming unavailable with 404. API and image responses are controlled at the HTTP boundary.

The full browser suite passed all 34 catalogue and detail cases. All 17 backend unit tests, strict type checks across the three workspaces and the combined production build passed. Visual checks at 1440px and 390px confirmed the detail layout without horizontal overflow using controlled product and image responses. A separate read-only code review found no defects. This step did not repeat PostgreSQL integration or clean-clone installation checks, and the local backend was not running for a live API check.

The developer identified the challenge's explicit requirement to use MUI components with a consistent theme. Codex migrated the catalogue, product detail and shared navigation to MUI 9.5 and Emotion. One theme defines palette, typography, shape, button defaults and keyboard focus. `ThemeProvider`, `CssBaseline` and `StyledEngineProvider` apply it to the client-only SPA, while remaining layout CSS receives its colours from theme-generated variables. The existing router, API queries and Redux state were preserved. No cart functionality was added during this correction.

The implementation follows the official MUI documentation for [installation](https://mui.com/material-ui/getting-started/installation/), [theming](https://mui.com/material-ui/customization/theming/), [routing](https://mui.com/material-ui/integrations/routing/) and [TextField native select mode](https://mui.com/material-ui/react-text-field/#select). Native selects retain mobile behaviour and the existing URL-driven controls. Ratings use MUI's read-only accessible image semantics with Spanish labels.

Visual review exposed mobile overflow for an unbroken 201-character category name; a failing browser assertion reproduced it before word wrapping was added. Independent review also identified that MUI's button reset suppressed the global keyboard outline. A keyboard test reproduced that failure before enabling the installed MUI version's shared `focusVisible` theme option.

After the MUI migration, all 38 desktop/mobile browser cases, all 17 backend unit tests and strict type checks across the three workspaces passed. Coverage includes shared action styling across catalogue and detail, keyboard focus on buttons and cards, and wrapping of long category names. Visual checks confirmed catalogue and detail layouts at 1440px and 390px. The combined production build passed outside the sandbox after the sandboxed export encountered an `EPERM` while creating a generated Next.js directory. No build configuration was changed to work around that environment error.

Cart behaviour and Docker packaging for the applications remain pending. Production direct product URLs still require the Nginx SPA fallback planned for that packaging step; product IDs are not enumerated during static export. Reads assume a small catalogue with offset pagination and unindexed substring search. Imports still assume a small in-memory catalogue and a single backend instance; distributed coordination and production TLS configuration remain outside this step.

This record will be updated as code is developed, including accepted or rejected suggestions and the checks used to validate them.
