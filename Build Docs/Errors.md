# Error Log & Incident Registry

This document records every error, build failure, test failure, runtime issue, and edge-case bug encountered during development, along with its root cause analysis and verified fix.

---

## Format
```markdown
### [ERR-XXX] Short Title
- **Date & Time:** YYYY-MM-DD HH:mm:ss
- **Module:** Module X - Name
- **Phase:** [Scaffolding | Build | Database | API | UI | Test]
- **Symptoms / Error Message:**
  ```text
  Raw error logs or stack trace
  ```
- **Root Cause Analysis:** Why this occurred.
- **Resolution / Fix:** How it was resolved.
- **Prevention:** Best practices implemented to avoid regression.
```

---

## Log Entries

### [ERR-004] Turbopack conflict: cacheComponents incompatible with dynamic route config
- **Date & Time:** 2026-11-03 19:18:40
- **Module:** Module 1 - Core Build
- **Phase:** Next.js Configuration & Build
- **Symptoms / Error Message:**
  ```text
  Error: Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`. Please remove it.
  ```
- **Root Cause Analysis:** `create-next-app` added experimental `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`, which conflicts with standard dynamic cookie evaluation in Next.js App Router.
- **Resolution / Fix:** Disable experimental `cacheComponents` and `partialPrefetching` in `next.config.ts` to allow standard dynamic route evaluation.
- **Prevention:** Do not enable unneeded experimental flags for mission-critical B2B apps.

- **Date & Time:** 2026-11-03 19:18:00
- **Module:** Module 1 - Core Build
- **Phase:** Build / Production Prerender
- **Symptoms / Error Message:**
  ```text
  Error: Route "/": Next.js encountered uncached or runtime data during prerendering.
  `cookies()` accessed outside of <Suspense> prevents the route from being prerendered.
  ```
- **Root Cause Analysis:** `src/app/page.tsx` called `await cookies()` to read session cookie for automatic redirect, but Next.js 16 defaults to static prerendering unless marked dynamic.
- **Resolution / Fix:** Add `export const dynamic = "force-dynamic";` to `src/app/page.tsx`.
- **Prevention:** Mark server component routes that access headers or cookies with `export const dynamic = "force-dynamic"`.

- **Date & Time:** 2026-11-03 19:16:30
- **Module:** Module 1 - Test Harness
- **Phase:** Test / Vitest Execution
- **Symptoms / Error Message:**
  ```text
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite' imported from .../node_modules/vitest/dist/chunks/nativeModuleRunner.js
  ```
- **Root Cause Analysis:** Vitest 5+ delegates module resolution and bundling to `vite`. When installing vitest with `--legacy-peer-deps`, the optional peer dependency `vite` was not automatically installed.
- **Resolution / Fix:** Explicitly install `vite` as a dev dependency: `npm install -D vite --legacy-peer-deps`.
- **Prevention:** Always install `vite` alongside `vitest` when testing Next.js TypeScript codebases.

- **Date & Time:** 2026-11-03 19:10:00
- **Module:** Module 1 - Scaffolding & Setup
- **Phase:** Scaffolding / Package Installation
- **Symptoms / Error Message:**
  ```text
  npm error code ERESOLVE could not resolve
  While resolving: vitest@5.1.0
  Found: @types/node@20.19.43
  Could not resolve dependency:
  peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.1.0
  ```
- **Root Cause Analysis:** `create-next-app` generated `package.json` with `@types/node: "^20"` while Node runtime is v24.16.0 and the latest `vitest` expects `@types/node@^22 || >=24`.
- **Resolution / Fix:** Update `@types/node` in `package.json` to `"^22"` (or install with `--legacy-peer-deps`) matching Node 24 runtime.
- **Prevention:** Match `@types/node` major version to the installed Node LTS version.

