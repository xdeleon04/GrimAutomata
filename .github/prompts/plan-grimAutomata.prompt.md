## Plan: Copilot Instructions + Validation

This plan updates the workspace instructions file and builds a concrete verification checklist for scraping correctness and tests. I will add a concise .github/copilot-instructions.md that reflects actual patterns (Next.js + Tailwind + Firebase + Genkit) and explicitly documents build/test commands and security caveats. In parallel, I will outline a validation plan that combines fixture-based assertions with live smoke checks, focusing on the scraping flow in the MonstersGame service and the bot scheduler, and verifying tests cover the right behaviors. Decisions reflected: use `stamina_reserve` as the alchemy trigger, include live smoke checks, require encryption-at-rest, and warn about committed secrets.

**Steps**

1. Create .github/copilot-instructions.md and document code style and UI conventions using [src/app/globals.css](src/app/globals.css), [tailwind.config.ts](tailwind.config.ts), [components.json](components.json), and dashboard composition in [src/components/dashboard/Dashboard.tsx](src/components/dashboard/Dashboard.tsx).
2. Document architecture and data flow: UI scheduler and persistence in [src/components/dashboard/StatusHeader.tsx](src/components/dashboard/StatusHeader.tsx), scraping and automation in [src/services/monsters-game.ts](src/services/monsters-game.ts), and Genkit flow wrapper in [src/ai/flows/moon-id-sync-flow.ts](src/ai/flows/moon-id-sync-flow.ts).
3. List build/test commands from [package.json](package.json) and note the TS/ESLint bypass in Next config as a reason to run `npm run typecheck` and `npm run lint` explicitly in [next.config.ts](next.config.ts).
4. Capture project conventions and integration points: Firebase providers/hooks in [src/firebase/provider.tsx](src/firebase/provider.tsx) and [src/firebase/firestore/use-doc.tsx](src/firebase/firestore/use-doc.tsx), error propagation in [src/firebase/non-blocking-updates.tsx](src/firebase/non-blocking-updates.tsx), and security rules in [firestore.rules](firestore.rules).
5. Add security guidance: credential storage and the encryption-at-rest requirement, referencing [src/components/dashboard/CredentialManager.tsx](src/components/dashboard/CredentialManager.tsx) and [docs/backend.json](docs/backend.json), plus the warning to remove/rotate any committed env keys and add .env to .gitignore if needed.
6. Draft the validation checklist for scraping correctness: MoonID login and cookie handling, status parse fields, busy/cooldown gates, and each automation branch in [src/services/monsters-game.ts](src/services/monsters-game.ts), with fixtures referenced from [src/**tests**/fixtures/monsters-game](src/__tests__/fixtures/monsters-game).
7. Review test intent alignment: confirm tests cover the intended automation paths in [src/**tests**/monsters-game.test.ts](src/__tests__/monsters-game.test.ts) and UI control flow in [src/**tests**/StatusHeader.test.tsx](src/__tests__/StatusHeader.test.tsx), plus dashboard rendering tests in [src/**tests**/Dashboard.test.tsx](src/__tests__/Dashboard.test.tsx), [src/**tests**/ActivityLog.test.tsx](src/__tests__/ActivityLog.test.tsx), and [src/**tests**/QuickStats.test.tsx](src/__tests__/QuickStats.test.tsx).
8. Propose a minimal live smoke check plan: run the bot once, confirm stats/log updates in Firestore and UI, and verify scraping outputs match actual page values.

**Verification**

- Run `npm run test`, `npm run typecheck`, and `npm run lint` from [package.json](package.json).
- Perform one live smoke run of the bot and compare UI stats and logs with live page data.

**Decisions**

- Use `stamina_reserve` as the alchemy trigger.
- Include live smoke checks in the verification plan.
- Require encryption-at-rest for stored MoonID passwords.
- Include a warning to remove/rotate any committed env keys and add .env to .gitignore.
