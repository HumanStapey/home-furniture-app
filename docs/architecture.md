# Architecture and API details

This is the technical reference for the Home Furniture App. Start with the [README](../README.md) to run the app or find test commands.

## Design decisions

The project is one repository with three npm workspaces. Both applications use strict TypeScript.

- **Frontend:** Next.js builds a static, client-rendered React app. React Router handles `/products`, `/product/:id`, and `/cart`. Product IDs are not enumerated during the build.
- **Backend:** NestJS exposes the REST API. Requests pass through a controller, a service containing application rules, and a repository that reads PostgreSQL through TypeORM.
- **Shared contracts:** `packages/contracts` exports `Product`, `Category`, `ProductsQuery`, `ProductsResponse`, and `ApiError`. These are framework-independent TypeScript types, not runtime validation. `CartItem` belongs to the frontend; database entities and validation classes belong to the backend.
- **Data source:** Fake Store API supplies imports. Normal catalogue requests read the local database, allowing the app to keep serving saved products during an upstream outage.

Next.js was retained as the build and development framework; React Router satisfies the application's client-routing requirements. This arrangement fits static hosting, but products are loaded after JavaScript starts and are absent from the initial HTML. Server-rendered product pages and Vite were considered and not selected.

## Frontend state and navigation

RTK Query, the data-fetching part of Redux Toolkit, caches catalogue pages, category names, and individual products. Requests use `/api` on the website's own address and have a ten-second timeout. Cached requests are refreshed after reconnection and when revisiting data older than 60 seconds. Unused cache entries remain for 60 seconds.

Search, category, sorting, and pagination are stored in the URL. Search submission and filter or sort changes reset pagination. Invalid URL values are normalized before requests. The detail page's return link preserves the originating catalogue query in navigation state; opening a detail URL directly returns to the unfiltered catalogue.

Only results belonging to the current query are displayed. A failed catalogue refresh may retain that query's cached results with a warning. A failed detail refresh hides cached details, including when a product has become unavailable or returns `404`. Loading, empty results, missing products, and temporary failures have distinct interface states and recovery actions.

MUI supplies the controls and shared theme in `frontend/src/theme.ts`. Layout colours come from that theme. Views have descriptive browser titles and focusable main landmarks; skip links, quantity feedback, loading messages, image alternatives, visible focus, and reduced-motion support are included. Accessibility browser tests are in `frontend/test/accessibility.spec.ts`.

## Cart and money

A Redux slice manages the cart. Adding a product adds the selected quantity or increases its existing line. The combined quantity must be an integer from 1 to 100 per product. Re-adding a product replaces its saved product information with the latest API response.

Cart edits commit when the field loses focus or Enter is pressed. Invalid edits restore the previous quantity; invalid additions restore a selection of one. Linked explanations identify rejected input and announce the restored value.

Prices are converted to integer cents before multiplication and addition. Operations are rejected if the cent total would exceed JavaScript's safe integer range. Currency formatting uses `BigInt` and `Intl.NumberFormat.formatToParts` to preserve the final cent digits even for large accepted totals.

Only cart items are saved under `home-furniture:cart` in `localStorage`, the browser's local storage. API caches are not saved there. Restoration validates product fields, HTTP(S) image URLs, quantities, unique IDs, and the safe cent total. Invalid saved data starts an empty cart. If storage is blocked or full, the cart remains usable in memory but new changes cannot be retained between visits.

The cart has no checkout, stock checks, backend persistence, or continuous price updates. Browser tabs keep independent in-memory carts; the last storage write wins. Any future checkout must validate current prices and availability on the backend.

## API reference

The public base path is `/api`. Interactive documentation is at `/api/docs`, and its JSON definition is at `/api/docs-json`.

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/products` | Search, filter, sort, and paginate stored products |
| `GET /api/products/categories` | Distinct category strings in alphabetical order |
| `GET /api/products/:id` | One stored product; IDs must be positive integers up to `2147483647` |

The catalogue response is `{ items, total, page, limit, totalPages }`. `items` contains products; `total` counts all matching products before pagination. Product prices are numbers, and ratings have the shape `{ rate, count }`. Detail responses use the same product shape as catalogue items.

### Catalogue query parameters

| Parameter | Accepted values | Default |
| --- | --- | --- |
| `search` | Case-insensitive literal text search in titles and descriptions; up to 200 characters | No search |
| `category` | Exact category name, without truncation | All categories |
| `page` | Integer from 1 to `2147483647` | `1` |
| `limit` | Integer from 1 to 100 | `12` |
| `sort` | `id`, `title`, or `price` | `id` |
| `order` | `asc` or `desc` | `asc` |

Search and category filters combine. Search whitespace is trimmed. Empty search and category values apply no filter. `%` and `_` are ordinary search characters. Equal sort values are resolved by ascending ID. A page beyond the last page returns an empty `items` array while retaining the total. No matching products produces `totalPages: 0`.

### Errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid ID or query, unknown parameter, repeated scalar parameter, or null character in a text filter |
| `404` | Product not found in an available catalogue |
| `503` | No locally stored catalogue is available yet |
| `500` | Unexpected failure; SQL and stack traces are not exposed |

All three product endpoints return `503` if the database has no products. A search with no matches in an existing catalogue returns `200` with an empty list.

The shared error shape is `{ statusCode, message, error }`. Validation messages are arrays; other messages are strings. NestJS validates requests with `class-validator` and explicitly transforms values with `class-transformer`. Shared TypeScript types do not replace these runtime checks.

## Database and migrations

Compose pins PostgreSQL to `postgres:18.6-alpine3.24`. The product table uses the source product ID as its primary key, without generating new IDs. All columns are required. Titles, descriptions, categories, and image references use `TEXT`; ratings use separate `rating_rate` and `rating_count` columns.

Prices use `NUMERIC(12,2)`, from zero through `9999999999.99`. Entities keep prices as decimal strings to preserve database precision; the API maps them to the numeric public contract. Constraints also reject nonpositive IDs, blank titles, categories or image references, ratings outside 0–5, and negative rating counts. IDs and rating counts must fit PostgreSQL's signed 32-bit integer range.

NestJS and the TypeORM command-line tool share settings loaded from the root `.env`. Existing environment variables take precedence. Required values and port ranges are validated without logging credentials. Each database connection attempt has a five-second timeout; application startup allows up to three attempts.

Automatic schema synchronization and automatic TypeORM migration execution are disabled. Docker explicitly runs the migration command before starting NestJS. During local development, apply migrations yourself.

| Command, from the repository root | Purpose |
| --- | --- |
| `npm run migration:show` | List applied and pending migrations |
| `npm run migration:run` | Apply pending migrations transactionally; skip already applied migrations |
| `npm run migration:revert` | Undo the last migration; reverting the initial migration deletes the product table and its data |

These commands compile the backend first. The data source is `backend/src/database/data-source.ts`, compiled to `backend/dist/database/data-source.js`. The initial migration creates `products` in the default `public` schema; TypeORM records applied migrations in `migrations`. Migrations create the structure, and the separate import fills it with products. Add future schema changes as new migrations rather than modifying one already applied.

## Product import and failures

The backend imports products in the background at every startup, even if local products already exist. It stops retrying after its first successful import. A manual seed command uses the same importer for one attempt and exits with an error on failure.

The import process:

1. Fetches Fake Store API with a ten-second deadline.
2. Validates the entire response before writing: a nonempty product array, unique valid IDs, required fields, nested ratings, HTTP(S) image URLs, and prices with at most two decimal places. Strings are not silently converted to numbers; extra source fields are ignored.
3. Saves the batch in one database transaction. New IDs are inserted, changed products are updated, and identical records are left untouched. Products absent from the response are retained.

A failed validation or database write leaves the previous catalogue intact. PostgreSQL can round extra fractional price digits, so import validation rejects such prices before writing them. Validation starts from parsed JSON numbers and cannot recover precision already lost in the source representation.

After a startup failure, the next import attempt is scheduled 60 seconds later. Attempts do not overlap. Shutdown cancels HTTP work and scheduled retries, then waits for any active import before closing the database connection. Logs identify failures without dumping upstream payloads or database write details.

The API continues serving existing products during import failures. If there are no saved products, it returns `503`. The interface's retry button repeats a request to our API; it does not trigger an upstream import.

This design assumes a small in-memory catalogue and one backend instance. Larger sources would need response-size limits and batching; multiple instances would need import coordination. Offset pagination and substring searches have no dedicated search indexes and suit the current small source. Text ordering follows the database collation.

## Docker and routing

Frontend and backend use separate multi-stage images. Node.js 22 builds the applications. Nginx serves the frontend's static output; the backend runtime installs production dependencies and runs as the unprivileged Node user. `.dockerignore` restricts build contexts to source and workspace manifests, excluding local environment files, credentials, dependencies, and generated output.

Startup follows database health, backend migrations and API health, then frontend health. A failed migration prevents the backend from starting. The frontend health check requests `/api` through Nginx, so serving static files alone is insufficient to mark it healthy. These checks do not wait for product import completion.

Nginx forwards `/api` requests to NestJS and preserves response bodies and HTTP statuses. Other client routes fall back to `/index.html`, allowing direct product links and reloads. Missing `/_next/` assets retain a real `404`. Docker DNS is refreshed with one-second validity and resolution timeouts so the proxy can recover when a backend is recreated or initially unavailable.

Only the website and the local database port are published, both on loopback addresses. The backend connects internally to `db:5432`. PostgreSQL stores its files in a named volume mounted at `/var/lib/postgresql`; normal container recreation and `docker compose down` retain that volume. Changing `.env` credentials does not change users in an already initialized database.

This is a local challenge application. Public deployment, TLS configuration, multi-instance coordination, checkout, and production monitoring are outside the implemented scope.
