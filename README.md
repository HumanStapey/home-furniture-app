# Home Furniture App

A product explorer for the IKEA Fullstack Developer Technical Challenge, with search, category filters, pagination and product details.

A shopping cart is planned as an extra, with quantity controls, item removal, totals and persistence between visits.

The workspace structure, PostgreSQL persistence, catalogue import and catalogue API are in place. Frontend features will follow in small, verifiable contributions.

## Prerequisites

- Git.
- Docker Desktop.
- Node.js 22 and npm 11 for local development.

## Setup

Clone the repository, open its root directory and install the local workspaces:

```sh
npm ci
```

Copy `.env.example` to `.env` on first setup and review the values. The example credentials are for local development only. Start PostgreSQL before the backend:

```sh
docker-compose up
```

Compose currently starts only PostgreSQL. To start it in the background and wait until healthy, use `docker-compose up -d --wait db`.

In another terminal, apply pending migrations before starting the applications:

```sh
npm run migration:run
```

Start each application in a separate terminal:

```sh
npm run dev:frontend
npm run dev:backend
```

The frontend runs at [localhost:3000](http://localhost:3000) and currently shows the startup screen. The backend exposes its catalogue at [localhost:3001/api/products](http://localhost:3001/api/products). Explore and test the API in [Swagger](http://localhost:3001/api/docs); the OpenAPI document is available at `/api/docs-json`.

The backend imports products in the background at startup. To refresh the catalogue manually, run `npm run seed` from the root after applying migrations. This command makes one attempt, closes the database connection and exits with a nonzero status on failure. It uses the same validation and storage logic as the startup import.

Check all three workspaces with `npm run typecheck` and run configuration, import validation and retry tests with `npm test`. With PostgreSQL running, use `npm run test:integration --workspace @home-furniture/backend` to verify migrations, product constraints, import behaviour and startup. Storage tests use temporary schemas that are removed afterwards. Build both applications with `npm run build`. The frontend exports static files to `frontend/out`; the backend compiles to `backend/dist`.

PostgreSQL is available at `localhost:15432`, mapped to port `5432` inside the container. Set `DB_PORT` in `.env` to change the local port. Data lives in a named Docker volume and survives container recreation and `docker-compose down`.

PostgreSQL creates the database and credentials when the volume is first initialized. Changing `.env` later does not update existing database users or passwords.

NestJS and the TypeORM CLI share connection settings from the root `.env`; existing environment variables take precedence. `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` are required. Invalid settings stop startup with a configuration error. Database connections use a five-second timeout per attempt, with up to three attempts at startup.

Automatic schema synchronization and migration execution are disabled. The CLI data source is `backend/src/database/data-source.ts`, compiled to `backend/dist/database/data-source.js`. Migration commands compile the backend first and use the same connection settings as NestJS.

- `npm run migration:show`: list applied and pending migrations.
- `npm run migration:run`: apply pending migrations transactionally; already applied migrations are skipped.
- `npm run migration:revert`: undo the last applied migration. Reverting the initial migration drops `products` and deletes its data.

The initial migration creates `products` in the default `public` schema; TypeORM records executions in `migrations`. It creates no product data. Future schema changes should use new migrations, keeping already applied migrations unchanged.

## Architecture

The monorepo uses npm workspaces. Both applications use strict TypeScript:

```text
frontend/           Next.js, React Router and Redux Toolkit
backend/            NestJS and TypeORM
packages/contracts/ Shared catalogue API types used by frontend and backend
```

The shared contracts package reduces duplicate type definitions and keeps the API contract consistent. It exports `Product`, `Category`, `ProductsQuery`, `ProductsResponse` and `ApiError`, with no framework dependencies or runtime code. Both applications declare it as a local workspace dependency.

`Category` is a string, and `Product` preserves the source fields, including numeric prices and ratings. `ProductsQuery` supports search, category, page, limit, sort and order. `ProductsResponse` contains items and pagination metadata. These are compile-time contracts; positive IDs, quantity limits and external data still require runtime validation.

`CartItem` lives in the frontend and contains a product and its quantity. Database entities, Fake Store import types and runtime validation DTOs will remain in the backend.

Next.js with a static export is the best fit for the selected stack. React Router will handle `/products`, `/product/:id` and `/cart`, while Nginx will serve the application.

RTK Query will cache catalogue requests. Search, filters and pagination will live in the URL to preserve the current view when navigating back.

A Redux slice will manage the cart and persist it in `localStorage`.

The frontend image will use a multi-stage build: Node.js compiles the application, and Nginx serves the static files, supports direct navigation to client routes and forwards `/api` requests to NestJS.

```mermaid
flowchart LR
    Browser[Browser] --> Nginx[Nginx]
    Nginx --> API[NestJS API]
    API --> DB[(Database)]
    Fake[Fake Store API] --> Import[Catalogue import]
    Import --> DB
```

Fake Store API supplies the catalogue. The backend validates and stores imported products; catalogue requests follow Controller → Service → Repository and read only PostgreSQL. The frontend will request product data exclusively from this backend.

Available endpoints:

- `GET /api/products`: search, category, sorting and pagination.
- `GET /api/products/categories`: available categories.
- `GET /api/products/:id`: product details, with a 404 for missing products.

`GET /api/products` returns `{ items, total, page, limit, totalPages }`. Prices are numbers and ratings keep the source shape `{ rate, count }`. Categories are distinct, alphabetically ordered strings. Product details return the same product shape as catalogue items.

| Parameter | Behaviour | Default |
| --- | --- | --- |
| `search` | Literal, case-insensitive search in title and description; up to 200 characters | No search |
| `category` | Exact category name; up to 200 characters | All categories |
| `page` | Integer from 1 to 2147483647 | `1` |
| `limit` | Integer from 1 to 100 | `12` |
| `sort` | `id`, `title` or `price` | `id` |
| `order` | `asc` or `desc` | `asc` |

Search and category filters combine. Search whitespace is trimmed; empty search and category values apply no filter. `%` and `_` are literal search characters. Equal sort values are resolved by ascending ID. Pages beyond the last page return an empty list while retaining the total count; no matches return `totalPages: 0`.

Query values are validated with `class-validator` and explicitly transformed with `class-transformer`. Unknown parameters, repeated scalar values, invalid IDs and invalid pagination or sorting return `400`. IDs must be positive 32-bit integers. Missing products return `404` when a local catalogue exists; an empty catalogue returns `503` for all three product endpoints. Unexpected failures return a generic `500` without SQL or stack traces.

The global exception filter returns `{ statusCode, message, error }`; validation messages are arrays and other messages are strings. Swagger documents the query parameters, response models and error statuses.

## Storage and import

PostgreSQL 18.6 is selected, using the pinned `postgres:18.6-alpine3.24` image. The product entity, initial migration and seed are implemented.

`ProductEntity` uses the source ID as a non-generated integer primary key. All fields are required. Prices use `NUMERIC(12,2)` and remain strings inside the entity to preserve exact decimals; the API maps them to the shared numeric `Product` contract. Ratings use `rating_rate` and `rating_count` columns. Constraints reject nonpositive IDs, negative or out-of-range prices, blank titles, categories or image references, ratings outside 0–5 and negative rating counts. Text fields use `TEXT` without arbitrary length limits.

IDs and rating counts are limited to PostgreSQL's signed 32-bit integer range. Import validation checks HTTP(S) image URLs and rejects prices with more than two decimal places before writing: PostgreSQL itself rounds excess decimal places when assigning a `NUMERIC(12,2)` value. Validation uses `class-validator` and `class-transformer` without implicit type conversion; additional source fields are ignored.

- Use Fake Store IDs as product primary keys. Store prices as exact `NUMERIC(12,2)` values, rejecting negative, out-of-range or higher-precision prices rather than silently rounding them. The API keeps `price: number`; cart calculations will use integer cents.
- Insert new products, update changed fields and leave identical products untouched through a transactional upsert. Preserve local products missing from a response.
- Validate the complete response, including ratings and duplicate IDs, before writing. Reject empty responses. Apply each batch in a transaction so a failed write leaves the existing catalogue intact.
- Run an import in the background at backend startup, including when local products already exist. HTTP requests have a ten-second deadline. Schedule the next attempt 60 seconds after a failure, without overlapping attempts, and stop after the first success. Shutdown cancels HTTP work and scheduled retries and waits for an active import before closing the database connection.

Migrations must complete before the API starts. An external import failure does not prevent startup and leaves stored products intact. Failures are logged without dumping upstream responses or database write details. The catalogue API serves existing products and returns `503` when no catalogue is available. The upcoming frontend will show a temporary-unavailability message with a retry button that queries our API again without triggering an external import. Searches with no matches return `200` with an empty list.

## Assumptions and limitations

- Fake Store is the only product source, and its IDs are assumed to remain stable.
- Prices have at most two decimal places. Exact database storage does not make JavaScript floating-point arithmetic exact.
- Products genuinely removed upstream will remain locally. Incorrect upstream values that pass validation may replace previously correct values.
- Updates happen at startup or through a manual import, without continuous synchronization. The first successful import requires Fake Store to be available; subsequent outages can leave the local catalogue outdated.
- Import coordination assumes a single backend instance. Multiple instances would require coordination to prevent overlapping imports.
- The small source catalogue is parsed and imported in memory. Larger sources would need response-size limits and a batching strategy. Price validation operates on JSON numbers after parsing; it cannot recover precision already lost in the source's numeric representation.
- Catalogue reads use offset pagination and substring search without dedicated search indexes, which suits the small source catalogue. Text ordering and case conversion follow PostgreSQL's database collation.

## Delivery

Development will progress through setup, persistence, import, API, catalogue, details, cart and Docker integration. Each contribution will include relevant verification and documentation. Delivery will include responsive and accessible interactions, automated coverage of a frontend flow and a backend rule, and a clean-clone setup check.

See [AI_USAGE.md](AI_USAGE.md) for how AI has supported the work so far.
