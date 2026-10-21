# Interview defense sheet

Prepared from the working tree on 20 October 2026, including the current README. Questions are predictions for a regional IT manager reviewing this challenge, not a claim about IKEA's interview process or internal systems. Answers are short rehearsal drafts in the first person.

**How to use:** rehearse the starred questions first. **[PERSONAL INPUT]** means the repository cannot establish your motivation, experience, ownership, or results; complete that part before using the answer. **Proposed** means future work, not an implemented capability. Evidence links point to code and documentation to open during follow-up questions. This was a source and documentation review; application tests and deployment were not rerun for this sheet.

## Opening answer: “What did you build?”

“This is a small public catalogue with search, filtering, product details, and an anonymous demo cart. A static React frontend calls a NestJS API backed by PostgreSQL. The backend imports and validates Fake Store data, so normal catalogue reads do not depend on the upstream API. I prioritized a reproducible local setup, explicit failure states, and tests around data integrity and cart behavior. Checkout, inventory, and public production operation remain outside the implementation.”

Evidence: [README scope and assumptions](../README.md#assumptions-and-limitations), [architecture](architecture.md#design-decisions).

## Architecture and scope

### 1. ★ Why this architecture, and where does a request go?

**Answer:** “The repository has frontend, backend, and shared-contract workspaces. In Docker, Nginx serves the static UI and forwards `/api` to NestJS. Controllers handle HTTP, the service handles catalogue rules and response mapping, and the repository handles PostgreSQL queries. That keeps transport, application rules, and persistence separate without introducing distributed backend services.”

**Decision to justify:** a layered backend is reasonable here; microservices would need a concrete operational or ownership benefit. There is no distributed-service architecture to defend.

Evidence: [workspaces](../package.json), [controller](../backend/src/products/products.controller.ts), [service](../backend/src/products/products.service.ts), [repository](../backend/src/products/products.repository.ts), [proxy](../frontend/nginx.conf).

### 2. ★ Why use Next.js and React Router together? Isn't that redundant?

**Answer:** “Next.js is retained for builds and local development; React Router owns application navigation. Production is a static export, with the app loaded with server rendering disabled and Nginx providing route fallback. It fits the selected client-rendered approach, but adds framework overlap and leaves product content out of the initial HTML. If the stack were unconstrained, I would reassess that overlap; if SEO became important, I would revisit rendering.”

**[PERSONAL INPUT]:** explain which technologies the original brief required and which you selected. The architecture document says React Router satisfies routing requirements and Vite and server rendering were considered; it does not establish your original reasoning or independently prove the brief's requirements.

Evidence: [documented decision](architecture.md#design-decisions), [Next configuration](../frontend/next.config.ts), [client-only entry](../frontend/src/app/[[...slug]]/client.tsx), [static routes](../frontend/src/app/[[...slug]]/page.tsx), [React routes](../frontend/src/App.tsx).

### 3. Why NestJS, TypeORM, PostgreSQL, and a contracts workspace for a small app?

**Answer:** “The implementation uses NestJS dependency injection to compose a small layered API, TypeORM for queries and migrations, and PostgreSQL constraints and transactions to protect imported data. Shared TypeScript contracts reduce duplicate API shapes without exposing database entities to the browser. These tools carry setup cost; the benefit here is an explicit API boundary and controlled persistence.”

**[PERSONAL INPUT]:** add your actual selection rationale and prior experience. Do not describe a required technology as an independent choice. Contracts are compile-time types, not runtime validation or independently versioned API compatibility.

Evidence: [module](../backend/src/products/products.module.ts), [entity](../backend/src/products/product.entity.ts), [contracts](../packages/contracts/src/index.ts), [database configuration](../backend/src/database/database.config.ts).

### 4. ★ How does this meet a regional furniture business's needs?

**Answer:** “It demonstrates catalogue browsing and a cart interaction, rather than a complete retail platform. The UI is Spanish, formatting uses `es-CL`, and prices are explicitly USD. Imported descriptions and categories retain their source language, and products are not restricted to furniture. A regional rollout would need agreed catalogue ownership, localized content, currency and tax rules, and integrations for any purchase journey.”

**[PERSONAL INPUT]:** confirm the target market and original acceptance criteria. Do not imply that the demo connects to IKEA systems, uses IKEA product data, or implements regional pricing, tax, delivery, or stock rules.

Evidence: [README assumptions](../README.md#assumptions), [formatting](../frontend/src/features/catalogue/product-format.ts), [contracts](../packages/contracts/src/index.ts).

## Data integrity, availability, and freshness

### 5. ★ Why import products instead of forwarding every request to Fake Store?

**Answer:** “The backend owns validation and reads from a saved local catalogue. A source outage therefore does not stop browsing when PostgreSQL already contains products. The trade-off is freshness: imports run at startup or manually, not on every browse. Images still load from external hosts, and the API and database must remain available.”

Evidence: [importer](../backend/src/products/products-import.service.ts), [read repository](../backend/src/products/products.repository.ts), [README limitations](../README.md#limitations).

### 6. ★ What stops a bad import from corrupting the catalogue?

**Answer:** “The importer validates the complete nonempty array before writing, including duplicate IDs, nested ratings, HTTP(S) image URLs, numeric types, and two-decimal prices. It then performs one transactional upsert. Invalid data or a database write failure preserves the previous catalogue. The database also enforces required fields and numeric constraints.”

**Follow-up:** validation starts with parsed JSON numbers; it cannot recover precision already lost upstream. The entire response is held in memory, with no explicit response-size limit.

Evidence: [`parseProducts`](../backend/src/products/fake-store-product.dto.ts), [`importBatch`](../backend/src/products/products.repository.ts), [migration constraints](../backend/src/database/migrations/1792110633249-CreateProducts.ts), [rollback and idempotency test](../backend/test/integration/products-import.test.cjs).

### 7. What happens to updated, deleted, or reused product IDs?

**Answer:** “The source ID is the database primary key and cart identity. Imports insert new IDs, update changed records, and skip updates when values are identical. Products absent from a later response remain saved. That avoids interpreting a partial response as a deletion, but may retain obsolete products; reused IDs can replace a different product. Stable IDs and a small catalogue are explicit assumptions.”

**Decision to justify:** this is an upsert policy, not full source reconciliation. Deletion or deactivation requires an agreed policy.

Evidence: [repository upsert](../backend/src/products/products.repository.ts), [retained-row test](../backend/test/integration/products-import.test.cjs), [README assumptions and limitations](../README.md#assumptions-and-limitations).

### 8. ★ What happens on startup when the source is unavailable?

**Answer:** “After database initialization, the API starts without waiting for the background import. HTTP fetching has a ten-second deadline; a failed startup import is retried sixty seconds after failure until one succeeds. Saved products remain readable. With an empty database, product endpoints return `503`, rather than presenting an unavailable catalogue as a valid empty search result.”

**Follow-up:** the frontend retry button repeats an API read; it does not start an import. Retries are fixed-delay, not exponential backoff. Shutdown cancels HTTP work and retries and waits for the active import; the HTTP deadline does not bound database writes.

Evidence: [startup runner](../backend/src/products/products-seed.runner.ts), [importer](../backend/src/products/products-import.service.ts), [availability rules](../backend/src/products/products.service.ts), [startup test](../backend/test/integration/products-startup.test.cjs).

### 9. ★ Are products refreshed every minute? Can you meet a ten-minute freshness target?

**Answer:** “No. Sixty seconds is the retry delay after a failed startup import, and retries stop after success. The README assumes an unchanged source for this challenge. The future plan proposes making source changes visible within ten minutes under healthy conditions, but that is not implemented or measured. A scheduled import owner, freshness timestamps, failure warnings, and frontend refresh behavior would all be needed.”

**Decision to justify:** browser cache refresh only rereads our database. Even importing every ten minutes leaves no allowance for import duration or browser refresh.

Evidence: [runner](../backend/src/products/products-seed.runner.ts), [current import policy](architecture.md#product-import-and-failures), [proposed freshness target](../FUTURE_IMPROVEMENTS.md#2-refresh-the-catalogue-independently-of-application-restarts).

### 10. How are API inputs, search, and errors controlled?

**Answer:** “Global runtime validation rejects unknown parameters, with explicit integer conversion and limits on IDs, page size, and search length. The repository binds filter values as parameters and chooses sort columns from a fixed map. Search is case-insensitive literal substring matching, so `%` and `_` are ordinary characters. Errors use one JSON shape, and unexpected failures return a generic `500` without SQL or stack traces.”

**Follow-up:** `400` means invalid input, `404` means a missing product in an available catalogue, and `503` means no saved catalogue yet. A database failure can return `500`; it is not automatically classified as `503`.

Evidence: [validation setup](../backend/src/configure-app.ts), [query DTOs](../backend/src/products/products-query.dto.ts), [query builder](../backend/src/products/products.repository.ts), [exception filter](../backend/src/common/http-exception.filter.ts), [API integration assertions](../backend/test/integration/products-api.test.cjs).

## Frontend state and customer trust

### 11. Why Redux Toolkit and RTK Query instead of component state alone?

**Answer:** “The cart is shared application state, while RTK Query manages fetched catalogue data. Search, filters, sort, and pagination live in the URL, and transient input and feedback stay in components. This avoids duplicating server data in a custom slice. RTK Query uses a ten-second request timeout, refetches on reconnection, and refetches on mount or argument change when cached data is older than sixty seconds.”

**Follow-up:** sixty seconds is not a polling interval. Unused entries use RTK Query's documented default sixty-second retention. Only cart state is persisted.

Evidence: [store and subscription](../frontend/src/store.ts), [API configuration](../frontend/src/features/catalogue/catalogue-api.ts), [documented caching](architecture.md#frontend-state-and-navigation).

### 12. How do you preserve navigation and avoid showing results for the wrong filter?

**Answer:** “Catalogue parameters are normalized into a canonical URL; filter changes and submitted searches reset the page. The UI uses RTK Query's `currentData`, so previous-query results are not presented as the new query's results. A detail link carries the originating catalogue query in navigation state. Direct product links return to the unfiltered catalogue. Failed catalogue refreshes can keep same-query results with a warning; failed detail refreshes hide cached details.”

Evidence: [query normalization](../frontend/src/features/catalogue/catalogue-query.ts), [catalogue view](../frontend/src/features/catalogue/catalogue-page.tsx), [product links](../frontend/src/features/catalogue/product-card.tsx), [detail view](../frontend/src/features/catalogue/product-detail-page.tsx), [navigation tests](../frontend/test/catalogue.spec.ts).

### 13. ★ Why store the cart in localStorage, and can users trust its prices?

**Answer:** “For an anonymous demo, browser storage provides reload persistence without account or cart services. It is limited to one browser profile and origin, has no cross-tab state synchronization, and can be edited by the user. Product fields and prices are snapshots: quantity edits do not refresh them, while re-adding an item replaces its product snapshot for all units. These totals must never authorize a real charge.”

**Follow-up:** invalid saved data restores an empty cart; blocked or full storage leaves changes in memory. Any purchase flow would need server-owned price and stock validation and customer acceptance of changed totals.

Evidence: [cart validation, reducers, persistence](../frontend/src/features/cart/cart.ts), [store subscription](../frontend/src/store.ts), [documented cart limits](architecture.md#cart-and-money).

### 14. How do you avoid monetary rounding and quantity errors?

**Answer:** “PostgreSQL stores `NUMERIC(12,2)` prices, represented as strings in the entity and mapped to numbers in the API. Imports reject extra decimal places. The cart converts prices to integer cents before multiplication and addition, rejects unsafe cent totals, and limits each product to an integer quantity from one to one hundred. Final cent formatting uses BigInt to preserve digits at large accepted totals.”

**Decision to justify:** this is bounded USD demo arithmetic, not arbitrary-precision financial accounting, currency conversion, or a tax engine. The quantity cap is an application rule, not available inventory.

Evidence: [price entity](../backend/src/products/product.entity.ts), [API mapping](../backend/src/products/products.service.ts), [cart arithmetic](../frontend/src/features/cart/cart.ts), [formatter](../frontend/src/features/catalogue/product-format.ts), [money and quantity tests](../frontend/test-unit/cart.test.cjs).

### 15. How did you address mobile use and accessibility?

**Answer:** “The app combines responsive layouts with labelled controls, visible focus, skip links, focusable main landmarks, loading announcements, and quantity-error feedback. Tests exercise keyboard navigation, focus, input contrast, cart interactions, and narrow layouts. The browser configuration runs desktop and mobile-sized Chromium cases. That is useful evidence, but it does not establish complete WCAG conformance or real-device Safari coverage.”

**[PERSONAL INPUT]:** state which manual checks you personally performed, on which devices or assistive tools. AI_USAGE records prior checks; it is not a fresh test report for this review.

Evidence: [accessibility tests](../frontend/test/accessibility.spec.ts), [cart browser cases](../frontend/test/cart.spec.ts), [browser configuration](../frontend/playwright.config.ts), [recorded verification](../AI_USAGE.md#verification-recorded-during-implementation).

## Delivery, security, and operations

### 16. ★ What do your tests prove, and what can still escape them?

**Answer:** “Unit tests target import validation, retries, configuration, and cart arithmetic and persistence. PostgreSQL integration tests exercise constraints, migrations, imports, API behavior, and startup. Browser tests exercise desktop and mobile flows with controlled API responses. Separate Docker checks verify routing, assets, API forwarding, and proxy DNS recovery. The main gap is an automated browser journey through the complete deployed frontend, proxy, API, and database.”

**Follow-up:** CI is configured to run lint, type checks, unit tests, PostgreSQL integration tests, builds, and Chromium tests. Docker checks are separate. The proxy recovery test uses a minimal HTTP server, not NestJS or database recovery; mocked upstream tests do not establish live source compatibility.

**[PERSONAL INPUT]:** bring the actual latest CI run and any local results you will cite. This sheet inspected test code and workflow configuration, not a fresh green run.

Evidence: [CI workflow](../.github/workflows/ci.yml), [test commands and boundaries](../README.md#tests-and-builds), [Docker smoke checks](../scripts/verify-docker.cjs), [DNS recovery check](../scripts/verify-docker-restart.cjs), [planned deployment tests](../FUTURE_IMPROVEMENTS.md#1-test-the-complete-deployment).

### 17. How reproducible is the setup, and how are database changes controlled?

**Answer:** “The local setup uses Compose, versioned container tags, a lockfile, and `npm ci`. A named volume retains PostgreSQL data across normal container recreation. Schema synchronization is disabled; Docker explicitly runs migrations before NestJS, while local development has an explicit migration command. This keeps schema changes reviewable. For production, I would run migrations once as a controlled release step.”

**Follow-up:** container tags are versioned but not digest-pinned. Editing `.env` does not change credentials already initialized in the database volume. Reverting the initial migration drops the product table, so it is not a safe generic rollback.

Evidence: [Compose](../compose.yaml), [backend image startup](../backend/Dockerfile), [database configuration](../backend/src/database/database.config.ts), [migration](../backend/src/database/migrations/1792110633249-CreateProducts.ts), [README setup](../README.md#run-the-app-with-docker).

### 18. Why a single origin and Nginx? What happens on a direct product URL?

**Answer:** “Browser API requests stay under the website's `/api` path, simplifying deployment without needing cross-origin browser API calls. Nginx forwards that path and serves static files, with an index fallback for React routes such as `/product/123`. Missing Next.js assets keep a real `404`. The proxy refreshes Docker DNS so it can recover when the backend address changes or becomes available.”

**Follow-up:** this is Docker-specific resolver configuration; another hosting platform requires adaptation. Static route fallback returns an HTML shell, not server-rendered product data or an HTTP product-level `404`.

Evidence: [Nginx configuration](../frontend/nginx.conf), [local Next.js rewrite](../frontend/next.config.ts), [Docker routing checks](../scripts/verify-docker.cjs).

### 19. ★ Docker says healthy, but customers see no products. How would you investigate?

**Answer:** “I would check a real catalogue request and separate an initial-import `503` from database or proxy failures. The `/api` health response is a static name: even the frontend health check only proves forwarding to that endpoint. I would inspect backend import logs and database connectivity and records. The production proposal separates process liveness from readiness for database access and an initial catalogue, with import freshness monitored independently.”

**Decision to justify:** existing health checks are useful but insufficient for catalogue readiness. An upstream outage should not make an otherwise usable saved catalogue unready.

Evidence: [static health controller](../backend/src/app.controller.ts), [health checks](../compose.yaml), [availability service](../backend/src/products/products.service.ts), [proposed monitoring](../README.md#monitoring-and-operational-readiness).

### 20. ★ Is this secure and ready for public production?

**Answer:** “It is a local challenge deployment with useful safeguards, not completed production hardening. Inputs are validated, query values are bound, errors are sanitized, local ports bind to loopback, and the backend runs as an unprivileged user. The README proposes HTTPS, managed secrets, verified database TLS, request limits, browser security headers, scanning, and restricted database permissions before public access. Catalogue reads are intentionally public; accounts or administrative functions would need authentication and authorization.”

**Decision to justify:** same-origin routing and Docker isolation are not complete security controls. Current database settings do not configure verified TLS. No claim of compliance or penetration testing is supported.

Evidence: [validation](../backend/src/configure-app.ts), [repository](../backend/src/products/products.repository.ts), [error filtering](../backend/src/common/http-exception.filter.ts), [backend image](../backend/Dockerfile), [deployment configuration](../compose.yaml), [proposed security work](../README.md#initial-hosting-and-security).

### 21. ★ What fails first if we add more regions, traffic, or backend replicas?

**Answer:** “The current assumptions are a small catalogue, modest traffic, one region, and one backend. Substring search, offset pagination, and whole-response imports need measurement before claiming capacity. Equal sort values use ID as a stable tie-breaker, but changing data can still shift offset pages. Replicas could independently import and migrate; I would coordinate imports or use one worker and move migrations out of application startup before scaling.”

**Follow-up:** cache refetch settings do not provide global consistency. Regional catalogue, currency, inventory, data ownership, and service objectives need requirements before choosing a regional architecture.

**[PERSONAL INPUT]:** supply actual latency, throughput, catalogue-size, or cost measurements if you have them. The repository provides no measured capacity guarantee.

Evidence: [queries and upsert](../backend/src/products/products.repository.ts), [in-memory import](../backend/src/products/products-import.service.ts), [startup runner](../backend/src/products/products-seed.runner.ts), [proposed scalability work](../README.md#scalability-and-later-evolution).

### 22. How would you release, roll back, and recover an incident?

**Answer:** “The proposed path is to pass CI, build images once with commit identifiers, validate those same images in staging, run a controlled compatible migration, and promote them. Previous images support application rollback; schema rollback and data recovery are separate decisions. Database backups need a rehearsed restore. Monitoring would cover real catalogue requests, latency, errors, database health, and time since successful import, with an owner and runbook.”

**[PERSONAL INPUT]:** agree hosting, budget, acceptable downtime, recovery time, and acceptable data loss. These are proposed operational steps; automated deployment, backup restoration, production dashboards, and recovery objectives are not implemented evidence.

Evidence: [proposed release and recovery](../README.md#release-and-recovery), [proposed monitoring](../README.md#monitoring-and-operational-readiness), [current CI](../.github/workflows/ci.yml).

## Judgment and personal ownership

### 23. ★ What would you improve first, and why?

**Answer:** “The documented order starts with browser tests through the full deployment, then scheduled refresh with visible freshness. Those address integration risk and stale catalogue data directly. Security, recovery, and monitoring remain prerequisites for public launch regardless of feature ordering. Cart synchronization comes later while purchases are outside scope; real checkout would require separate pricing, stock, order, and payment design.”

**[PERSONAL INPUT]:** explain your own priority under the interviewer's constraints. Ask whether the immediate goal is a stronger challenge demo, an internal pilot, or a public launch before estimating delivery. Do not invent fixed dates or costs.

Evidence: [priorities and dependencies](../FUTURE_IMPROVEMENTS.md), [production proposal](../README.md#path-to-production-proposed).

### 24. ★ How much did AI build, and what did you personally verify or change?

**Answer:** “AI_USAGE records Codex assistance across planning, implementation, tests, debugging, documentation, and the generated banner. It also records changes to generated suggestions, such as replacing a 100-option quantity selector and correcting focus, quantity feedback, mobile overflow, and large-total formatting. I am responsible for understanding and defending the final code.”

**[PERSONAL INPUT — complete before rehearsing]:** “My own contribution was [specific decisions and implementation/review]. One suggestion I changed was [actual example], because [reason]. I checked it using [test or reproduction I personally ran], with [observed result].” Do not turn repository-recorded fixes into an invented personal story.

Evidence: [AI assistance and decisions](../AI_USAGE.md), [quantity and precision regression tests](../frontend/test-unit/cart.test.cjs), [accessibility tests](../frontend/test/accessibility.spec.ts).

### 25. What would you simplify, and what was the hardest trade-off?

**Answer:** “The clearest simplification candidate is the overlap between Next.js and React Router, if the brief allows it. The main operational trade-off is preserving a usable saved catalogue while accepting stale data and no automatic deletion. The cart deliberately keeps a small demo scope, leaving authoritative purchases for a separate design.”

**[PERSONAL INPUT]:** name the trade-off you actually faced, alternatives you evaluated, your time constraints, and what you learned. The code can demonstrate consequences, but cannot establish what was hardest for you or how long development took.

Evidence: [architecture decisions](architecture.md#design-decisions), [import policy](architecture.md#product-import-and-failures), [AI decisions](../AI_USAGE.md#decisions-accepted-or-changed).

## Claims to keep precise

| Avoid saying | Defensible wording |
| --- | --- |
| “Next.js server-renders the catalogue.” | “Next.js exports a client-rendered app; products load after JavaScript.” |
| “The catalogue syncs every sixty seconds.” | “Failed startup imports retry after sixty seconds; success stops retries.” |
| “RTK Query polls every minute.” | “Age-based refetch happens on mount or argument change; it is not periodic polling.” |
| “It works offline.” | “Saved products survive an upstream outage; API, database, and external image dependencies remain.” |
| “The cart always shows current prices.” | “The cart stores snapshots; re-adding replaces a snapshot, quantity changes do not.” |
| “The one-hundred-unit cap protects inventory.” | “It is a quantity validation rule; there is no inventory integration.” |
| “Healthy Docker services mean the shop is ready.” | “Health checks do not verify database queries or an initial catalogue.” |
| “E2E covers the whole stack and all mobile browsers.” | “Browser cases mock the API and run desktop/mobile Chromium; deployment checks are separate.” |
| “It is production-ready / compliant / proven to scale.” | “Production controls and scaling steps are documented proposals, without those guarantees.” |

## Personal preparation checklist

- [ ] Compare the original challenge brief with the stack and feature scope; mark required versus chosen technologies.
- [ ] Fill in your actual framework rationale, development timeline, and one difficult trade-off.
- [ ] Prepare one truthful AI-assisted change story and explain the relevant code without relying on the generated explanation.
- [ ] Bring the latest real CI result; distinguish historical documentation from checks you ran yourself.
- [ ] State the intended region and business scope; leave hosting, capacity, cost, freshness, and recovery commitments open until supported by requirements and measurements.
- [ ] Practise opening the importer, repository transaction, query DTO, cart reducer, and CI workflow to explain the behavior directly.
