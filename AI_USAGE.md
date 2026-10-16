# AI Usage

OpenAI Codex assisted with requirements review, planning, implementation, debugging, tests, visual assets, and documentation. The developer remains responsible for understanding the code, checking AI output, and explaining the final decisions. Git history records the implementation changes.

## Where AI helped

- Compared the technical brief with the implementation and reviewed architecture and delivery plans.
- Implemented the npm workspaces, shared API types, NestJS API, PostgreSQL migrations, validated product import, and retry behaviour.
- Built the React catalogue, details, cart, URL-driven filters, request caching, responsive MUI interface, and accessibility fixes.
- Prepared Docker images, Nginx routing, automated checks, and documentation.
- Generated the original home-interior banner. The exact image prompt, provenance, and font licence notes are in [the image documentation](frontend/public/images/README.md).

## Skills used

Skills are instructions that guide the AI's workflow; they are not dependencies of the application.

| Skill | How it helped |
| --- | --- |
| **Ponytail** | Kept changes small, reused existing components and validation, and avoided unnecessary dependencies or features. |
| **frontend-design** | Guided the catalogue redesign: visual hierarchy, typography, the blue-and-yellow palette, responsive layouts, and the original home-interior banner. |
| **gstack-workflows** | `plan-eng-review` reviewed the remaining delivery plan; `qa` guided reproducing and fixing accessibility issues; `document-release` guided checking documentation against the implementation. Browser checks used Playwright. |
| **Superpowers** | Systematic debugging, test-driven development, and verification-before-completion guided reproducing failures, writing regression tests, and checking fixes before reporting success. |
| **Impeccable** | Provided accessibility review guidance for contrast, keyboard navigation, labels, and responsive behaviour. Its helper engine was unavailable, so checks used source inspection and Chromium directly. |

## Representative workflows

The requests below summarize development tasks; they are not verbatim prompt transcripts.

| Request | How the output was checked |
| --- | --- |
| Import products without losing the existing catalogue when the source fails | Validation and retry tests; PostgreSQL checks for atomic writes, idempotency, and retained products |
| Preserve catalogue filters and avoid unnecessary requests when navigating | Browser tests with controlled API responses, browser history, loading states, and failed refreshes |
| Add a small persistent cart with correct money calculations | Unit tests for quantities, integer cent totals, storage validation, and overflow; browser flows for add, edit, remove, and reload |
| Make the interface practical, responsive, and accessible | Desktop/mobile browser checks, screenshots, keyboard and focus tests, contrast measurements, and accessibility-tree inspection |
| Keep the quantity selector simple | Replaced a generated 100-option dropdown with the existing numeric-input pattern; browser tests check stepping, invalid values, and the shared 100-unit limit |
| Make the README understandable to a new reader | Compared instructions with source and configuration; checked documented commands, local links, and referenced files |

## Decisions accepted or changed

- **Keep the chosen stack:** Next.js, React Router, Redux Toolkit, MUI, NestJS, TypeORM, Nginx, and PostgreSQL. Vite was considered and not selected. The developer retained a shared contracts workspace to reduce duplicate API types.
- **Render the catalogue on the client:** this fits the existing query cache and static hosting. Server-rendered product pages were not added. Product content is absent from the initial HTML, which limits search-engine visibility without JavaScript.
- **Import into our database:** the frontend reads our API rather than fetching the external catalogue directly. Imports validate the whole batch and preserve saved data on failure.
- **Correct generated output when checks disagree:** review exposed missing keyboard focus after the MUI migration, lost cent digits when formatting very large totals, narrow-screen overflow, and silent quantity validation. Focused reproductions guided the fixes.
- **Use the existing components and rules:** accessibility changes reuse MUI and cart validation. No extra dependency was added for that review. React's native page-title rendering replaced an effect-based attempt that Next.js could overwrite during hydration.
- **Keep the cart limited:** no checkout, stock reservation, server-side cart, or automatic cross-tab synchronization was added.

Framework details were checked against installed documentation and official references, including [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports), [RTK Query caching](https://redux-toolkit.js.org/rtk-query/usage/cache-behavior), [React page titles](https://react.dev/reference/react-dom/components/title), and W3C guidance for [input contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) and [error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html).

## Verification recorded during implementation

The accessibility change was verified with:

- All 74 desktop/mobile Chromium browser cases and all 27 unit tests passing.
- Type checks across the three workspaces and the combined production build passing.
- Additional browser checks for landmarks, headings, labels, focus, text contrast, reduced motion, 320px reflow, and increased text spacing. Screenshots confirmed readable mobile quantity feedback.

Earlier implementation checks covered PostgreSQL migrations and constraints, API responses, imports and rollback, persistence after database container recreation, and an initial import into a temporary empty Docker database. Live browser checks also exercised the Docker application's catalogue and cart.

These are recorded results from development, not a claim that every suite runs on each documentation change. The README refresh checked instructions against the repository without rerunning application tests or rebuilding Docker images.

## Remaining limits

Direct checks with NVDA or VoiceOver and a final installation from a clean Git clone remain pending. Browser tests use controlled product responses on the development frontend, so they do not replace checks of the complete Docker deployment. Known application limitations are described in the [README](README.md#limitations-and-remaining-checks) and [technical reference](docs/architecture.md).
