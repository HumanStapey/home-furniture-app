# Future Improvements

This plan assumes a small public catalogue with imported data and an optional browser-local demonstration cart. All improvements are proposed work. Production deployment does not imply adding payments. Complexity estimates are relative and depend on the hosting platform.

## Priorities and implementation order

| Order | Timeframe | Improvement | Estimated complexity |
| --- | --- | --- | --- |
| 1 | Short term | Browser tests against the complete deployed application | Medium |
| 2 | Short term | Scheduled catalogue refresh and visible data freshness | Medium |
| 3 | Before public production launch | Deployment security, recovery, and operational monitoring | Medium–high |
| 4 | Longer term, conditional on product scope | Cart price synchronization and purchase-time validation | Medium for synchronization; checkout is a separate, larger project |

The first two improvements address the catalogue directly. Production safeguards remain launch prerequisites. Cart synchronization has lower priority while purchases are outside the scope.

## 1. Test the complete deployment

**Current limitation.** Browser tests use simulated API responses and can pass without a backend. PostgreSQL integration tests and Docker HTTP checks exist, but do not exercise browser flows through the production frontend, Nginx, API, and database together. CI currently runs the simulated browser suite.

**Proposed improvement and benefit.** Add browser tests against an isolated Docker deployment for catalogue loading, filtering, details, and cart interactions, using our real API. This would detect proxy, routing, and integration failures before release. Keep the existing focused tests for fast feedback and controlled error scenarios.

**Dependencies and trade-offs.** Provide an isolated database, readiness checks, cleanup, and a known test catalogue independent of live Fake Store availability. Otherwise, an upstream outage could fail a healthy deployment's tests. Prevent startup imports from contacting the live source or replacing test data. This adds setup and CI time. Controlled data cannot verify the live upstream contract; check that dependency separately.

## 2. Refresh the catalogue independently of application restarts

**Current limitation.** Imports run at startup or manually. Startup retries stop after success, so a long-running backend can serve outdated products despite browser refreshes. Failed imports already preserve stored products; keep that protection.

**Proposed improvement and benefit.** Schedule recurring imports, record the last successful import, and expose freshness information so the interface can warn about outdated catalogue data. This makes updates independent of restarts while retaining service during upstream failures. Describe catalogue freshness rather than stock availability, which the current source does not provide.

**Freshness target and validation.** A change available from the source should become visible in the catalogue within ten minutes under healthy operating conditions. This requirement rules out the initial hypothesis of four imports per day. In an isolated environment, change a controlled source immediately after an import and measure the delay through PostgreSQL and the browser, including frontend cache and refresh behaviour. Simulate import failures separately: preserve stored products, keep the last-success timestamp unchanged, and show a freshness warning when the ten-minute budget is exceeded. Source outages can prevent meeting the target; record and expose that condition.

**Dependencies and trade-offs.** Choose an interval that leaves room within ten minutes for import duration, frontend refresh, and retries. Even an import every ten minutes means 144 scheduled upstream requests per day, before retries and restarts, and leaves no processing margin. Validate source limits and measure import duration, errors, and resource use before selecting the interval. Visits query our database and do not multiply imports; backend replicas could. Use one scheduling owner and prevent overlapping runs.

Frequent imports cannot guarantee that the source itself is current. Products missing from later imports are currently retained; agree a removal policy before automating deletion.

## 3. Prepare for public production operation

**Current limitation.** Docker and CI exist; public HTTPS, managed secrets, verified database TLS, recovery procedures, structured logs, and alerting remain pending. API health checks do not confirm database access or catalogue readiness.

**Priority and benefit.** Follow the [production path in the README](README.md#path-to-production-proposed) before launch: isolate environments, secure access, verify releases, rehearse recovery, and monitor failures and import freshness. This reduces exposure and makes failures diagnosable and recoverable.

**Dependencies and trade-offs.** Agree hosting, cost, downtime, and recovery objectives. One backend instance simplifies operation but remains a single point of failure. Replicas require coordinated imports and migrations. Measure query times and resource use before scaling the architecture.

## 4. Revisit cart prices if the product scope expands

**Current limitation.** The optional cart stores product snapshots locally. Opening it does not refresh prices; re-adding a product updates its snapshot. Checkout and stock reservation are absent.

**Proposed improvement and benefit.** Refresh prices on entry to reduce catalogue/cart inconsistencies. On failure, warn that prices may be outdated and retry without blocking unrelated catalogue use. This has lower priority for a demonstration without purchases.

If purchases are introduced, validate authoritative prices on the backend at order confirmation and show changed totals for customer acceptance before charging. An entry-time refresh alone misses changes occurring while the customer stays on that page.

**Dependencies and trade-offs.** Extra requests require policies for failures, missing products, and price changes. Imported catalogue data cannot establish real stock availability. Orders, authoritative pricing, inventory, and payments need separate requirements and design.
