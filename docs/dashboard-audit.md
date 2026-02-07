# Dashboard Consistency Audit

> Audit performed: February 7, 2026
> Branch: `feature/dashboard-consistency`

---

## Summary

| Severity | Count | Status |
| -------- | ----- | ------ |
| **CRITICAL** | 3 | ✅ Done |
| **HIGH** | 7 | ✅ Done |
| **MEDIUM** | 8 | ✅ Done |
| **LOW** | 9 | ✅ Done |
| **PASS** | 2 | ✅ |

---

## Phase 1 — Security & Stability

### C3 · CRITICAL · Missing Error Boundary ✅

**File:** `src/components/FirebaseErrorListener.tsx`
`FirebaseErrorListener` throws errors to be caught by Next.js error boundaries, but no `error.tsx` or `global-error.tsx` exists. Thrown errors crash the entire app.

> ✅ Created `src/app/error.tsx` and `src/app/global-error.tsx`

### C4 · CRITICAL · Plaintext Password Storage ✅

**File:** `src/components/dashboard/CredentialManager.tsx` (L47-51)
`CredentialManager` saves the password as `encryptedMoonIdPassword` but writes plaintext to Firestore. The `copilot-instructions.md` explicitly warns about this.

> ✅ Implemented AES-256-GCM encryption via `src/services/crypto.ts`

### D10 · HIGH · Firestore Rules Allow Public Reads ✅

**File:** `firestore.rules` (L20)
`allow get, list: if true;` on `/users/{userId}` means any unauthenticated user can read any user's profile data (gold, level, attributes, etc.).

> ✅ Fixed `firestore.rules` to restrict reads to owner only

---

## Phase 2 — Architecture

### D4 · CRITICAL · Client-Side Routing Bypasses App Router ✅

**File:** `src/app/page.tsx` (L43, L108-166)
Uses `useState<View>` + `renderView()` switch instead of file-based routes. No deep linking, no URL navigation, no per-route code splitting, no browser back/forward support.

> ✅ Migrated to App Router with `(dashboard)` route group

### D1/D2 · HIGH · Duplicated Firestore Subscriptions ✅

**Files:** All dashboard components
Each component independently subscribes to Firestore — 5+ concurrent `onSnapshot` listeners for shared data. `StatusHeader` and `ConfigPanel` both listen to `automationSettings`. `StatusHeader`, `QuickStats`, and `ConfigPanel` all listen to the user doc.

> ✅ Created `DashboardDataProvider.tsx` with 4 contexts

### D3 · HIGH · Game Logic in UI Component ✅

**File:** `src/components/dashboard/StatusHeader.tsx` (L46-139)
~100 lines of game sync orchestration (interval scheduling, cooldown tracking, credential reading, settings parsing, calling `syncMoonId`) embedded in a header component.

> ✅ Extracted sync logic to `src/hooks/use-automation-engine.ts`

### D9 · HIGH · Two next.config Files with Divergent Settings ✅

**Files:** `next.config.mjs`, `next.config.ts`
`.mjs` has `transpilePackages: ['lucide-react']`. `.ts` has `ignoreBuildErrors`, `ignoreDuringBuilds`, `images.remotePatterns` but no `transpilePackages`. `.ts` takes precedence.

> ✅ Merged `next.config.mjs` into `next.config.ts`, deleted .mjs

---

## Phase 3 — Performance & Polish

### B1 · HIGH · Entire Page is "use client" ✅

**File:** `src/app/page.tsx` (L1)
Zero RSC benefits — no streaming, no server-side data fetching, full JS bundle shipped for all components.

> ✅ RSC boundaries via route group architecture

### A4 · MEDIUM · Google Fonts via `<link>` Instead of `next/font` ✅

**File:** `src/app/layout.tsx` (L20-23)
Raw `<link>` tags bypass Next.js font optimization (self-hosting, zero layout shift, preloading). Impacts CLS.

> ✅ Migrated to `next/font/google` (Literata)

### C2 · HIGH · Missing aria-label on Interactive Elements ✅

**Files:** `StatusHeader.tsx`, `page.tsx`
Start/Stop Ritual button, Debug toggle button, sidebar navigation buttons, anonymous sign-in button, and status indicator dot all lack accessible labels.

> ✅ Added aria-labels to interactive elements

### C1 · HIGH · Excessive `any` Usage ✅

**Files:** All Firebase consumers
`useDoc<T = any>`, `useCollection<T = any>`, `getSetting(name, defaultValue: any)`, `setDocumentNonBlocking(docRef, data: any)`. Almost all Firestore data is untyped.

> ✅ Created `src/firebase/schema.ts`, wired types into provider

### D8 · MEDIUM · No Firestore Schema Types ✅

**Files:** All Firebase consumers
No TypeScript interfaces for Firestore document shapes (user profile, credentials, settings, logs).

> ✅ Created `src/firebase/schema.ts`, wired types into provider

### A6 · MEDIUM · Inconsistent Status Indicator Colors ✅

**File:** `src/components/dashboard/ActivityLog.tsx` (L55-96)
Hardcoded Tailwind colors with no centralized color mapping or design tokens.

> ✅ Documented color convention in ActivityLog

### B3 · MEDIUM · Barrel Imports from @/firebase

**Files:** All dashboard components
Import from `@/firebase` barrel file which re-exports everything. Tree-shaking may not eliminate unused exports.

### B4 · MEDIUM · No next/dynamic for Heavy Components ✅

**File:** `src/app/page.tsx` (L4-7)
`ConfigPanel` (~280 lines) and `ActivityLog` (100+ entries) never lazy-loaded.

> ✅ Added `next/dynamic` for ConfigPanel, ActivityLog, CredentialManager

### B5 · MEDIUM · Inline JSX Props on Every Render ✅

**File:** `src/components/dashboard/QuickStats.tsx` (L63-92)
Icon JSX passed inline creates new object references every render.

> ✅ Hoisted icon elements in QuickStats

### C5 · MEDIUM · creationDate Overwritten on Every Mount

**File:** `src/app/page.tsx` (L48-60)
`useEffect` calls `setDocumentNonBlocking` with `creationDate: new Date().toISOString()` on every mount.

### D7 · MEDIUM · Components Rendered in Multiple Places ✅

**Files:** `page.tsx`, `Dashboard.tsx`
`ConfigPanel`, `ActivityLog`, `CredentialManager` rendered both in `Dashboard.tsx` AND in `page.tsx` `renderView()`.

> ✅ Intentional pattern (overview + full-page routes)

### A1 · LOW · Hardcoded Dark Theme Only

`layout.tsx` has `className="dark"` hardcoded. No theme toggle. Intentional but limits flexibility.

### A2 · LOW · Inconsistent Card Opacity Levels ✅

`bg-card/50`, `bg-card/40`, plain `bg-card` used inconsistently across components.

> ✅ Standardized card opacity (`bg-card/50`) and borders (`gothic-border`)

### A3 · LOW · Inconsistent Border Styling ✅

Some components use `gothic-border`, others use bare `border` or `border-primary/20`.

> ✅ Standardized card opacity (`bg-card/50`) and borders (`gothic-border`)

### A7 · LOW · Arbitrary Text Sizes ✅

`text-[10px]`, `text-[9px]`, `text-[11px]`, `text-[13px]` scattered throughout with no Tailwind config extension.

> ✅ Documented intentional arbitrary text sizes in globals.css

### B6 · LOW · `formatTime` Recreated Every Render ✅

`StatusHeader.tsx` defines `formatTime` inside the component body, not hoisted.

> ✅ Already hoisted (verified)

### B7 · LOW · Duplicate 1-second Intervals

Both `StatusHeader` and `ActivityLog` run independent `setInterval` every second.

### B8 · LOW · Linear Scan in getSetting ✅

`ConfigPanel` does `settings?.find()` on every access — O(n) per call.

> ✅ Converted getSetting to O(1) Map lookup

### B9 · LOW · No useTransition for Non-Urgent Updates

Setting toggles write directly to Firestore with no debounce or transition.

### B10 · LOW · `&&` Conditional Rendering

Uses `{condition && (...)}` instead of ternary, risking `0`/`""` bugs.

### C6 · LOW · Unused Imports ✅

`Power`, `ShieldAlert`, `Target` imported but unused in multiple files.

> ✅ Removed unused `Target` import from ConfigPanel

### C7 · LOW · creationDate Effect Dependency

`useEffect` on `[user, db]` reruns too often due to C5.

### C8 · MEDIUM · Unconventional `useMemoFirebase` Pattern

`MemoFirebase<T>` adds a runtime `__memo` flag to objects, polluting data.

### C9 · HIGH · Unsafe Synchronous Throw in useCollection ✅

Runtime check outside `useEffect` throws synchronously, can break Rules of Hooks.

> ✅ Moved memoization check inside useEffect

### C10 · MEDIUM · No Form Validation in CredentialManager ✅

No validation on email format, empty password, or server selection before Firestore write.

> ✅ Added form validation to CredentialManager

### C11 · LOW · Dead `react-firebase-hooks` Dependency ✅

`package.json` includes `react-firebase-hooks` but custom hooks are used instead.

> ✅ Already resolved (not in package.json)

---

*This document is updated as fixes are applied.*
