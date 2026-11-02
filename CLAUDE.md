# Mycerra™ website (SAVE EARTH Inc.) — working rules

The owner is addressed as **마이세라님** (CTO, SAVE EARTH Inc.). Reply in Korean, using honorifics.

## Design is frozen (approved 2026-11-02)

- Do **not** change fonts, font sizes, colours, spacing, per-row arrangement or section order
  without 마이세라님's explicit approval. Propose first; apply only after a yes.
- Before every commit that touches `src/`, `index.html`, `tailwind.config.ts` or `src/content/data/site.json`:
  `npm run build && npm run check:layout` — it must report "기준선과 동일 ✓".
- If it reports a difference: revert unintended changes. Only for an approved change run
  `npm run check:layout -- --update` and add a row to `docs/design-baseline/README.md` §5.
- Restore point: git tag `design-baseline-2026-11-02`. Details: `docs/design-baseline/README.md`.

## Never

- Bank account details anywhere except the admin-only `src/content/bankAccounts.ts`.
- PayPal secrets in `VITE_*` variables or frontend code.
- Server keys or `deploy.local.json` in git.
- Model identifiers in commits, PRs or repository files.

## Build

- `npm run build` = client build + SSR build + `scripts/prerender.mjs` (132 static pages, EN + `/ko`).
- Content lives in `src/content/data/*.json` (validated by `src/content/schema.ts`); the local CMS is `npm run cms`.
- Open items to ask about at final replacement: `docs/open-items.md`.
