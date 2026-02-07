# Project Guidelines

## Code Style

- Follow the App Router patterns in [../src/app](../src/app) and keep dashboard UI consistent with [../src/components/dashboard](../src/components/dashboard).
- Add or update tests alongside features in [../src/**tests**](../src/__tests__) using the existing fixtures and patterns.

## Architecture

- Keep game logic and API calls centralized in [../src/services/monsters-game.ts](../src/services/monsters-game.ts) and keep UI logic out of services.
- Firebase wiring stays in [../src/firebase](../src/firebase); do not bypass the provider pattern from UI components.

## Build and Test

- Dev server: `npm run dev`
- Tests: `npm run test`
- Typecheck gate: `npm run typecheck`
- Lint gate: `npm run lint`
- Production build: `npm run build`
- Do not rely on `npm run build` / `next build` as a typecheck/lint gate; always run `npm run typecheck` and `npm run lint`. Config is in [../next.config.ts](../next.config.ts).

## Project Conventions

- Keep route-level layout and styling in [../src/app](../src/app) and shared UI primitives in [../src/components](../src/components).
- When changing rules, update [../firestore.rules](../firestore.rules) in the same PR as Firestore schema changes.

## Integration Points

- MoonID sync behavior is defined in [../src/ai/flows/moon-id-sync-flow.ts](../src/ai/flows/moon-id-sync-flow.ts); keep flow inputs/outputs stable.
- Firestore access paths and config should remain aligned with [../src/firebase](../src/firebase).

## Security

- Rotate or remove any committed secrets immediately; .env\* must remain ignored per [../.gitignore](../.gitignore).
- The Firestore field is named `encryptedMoonIdPassword`, but current UI writes plaintext; do not store plaintext—if you touch this flow, add real encryption-at-rest before writing.
