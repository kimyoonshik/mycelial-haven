# Working rules for this repository

`mycogen/` (the (주)마이코젠 website) is edited by the owner on their own PC with the bundled editor.
**The owner's copy is the source of truth, not the copy in this repository.**
The owner's working folder is synced to their Google Drive as a folder named `mycogen`
(`content/site.json`, `content/media/`, `src/`, `editor/`, ...).

1. Never deliver a full ZIP or anything that replaces the owner's folder. The owner does not unzip new archives.
   (A full ZIP once overwrote hours of the owner's edits.)
2. Before any change, read the owner's latest files from that Drive folder and build on them,
   not on the copy in this repository.
3. Deliver only the files that changed, each with the exact path it goes to.
   - Code changes (`src/`, `editor/`, `scripts/`, launchers) must never include `content/site.json` or `content/media/`.
   - Content changes: give step-by-step editor instructions plus any new image files.
     Hand over a replacement `content/site.json` only when the owner asks, built from their latest copy,
     and say which version it was built from.

## The server (`mycogen/server/`)

The live site runs on the company's Ubuntu server (192.168.0.38), behind a Cloudflare Tunnel; see `mycogen/HOSTING.md`.
It pulls `main` every 5 minutes, so whatever is merged into `main` goes live.

- Content from the owner's editor (`content/site.json`, `content/media/`) still comes only from the owner's Drive folder ("GitHub 동기화").
- Blog posts, news written in the admin page (info.mycogen.co.kr) and inquiries live in PostgreSQL on that server, not in git.
  The server merges them into the site at build time; `site.json` is never written by the server.
- Run `npm run test:server` (needs `TEST_DATABASE_URL`) after changing anything in `server/`.
- When `src/` changes, the owner's PC also needs the changed files (rule 3 above), or the editor preview drifts from the live site.

# Coding behavior guidelines (andrej-karpathy-skills)

Source: https://github.com/forrestchang/andrej-karpathy-skills (CLAUDE.md, fetched 2026-11-08).
The working rules above take precedence wherever the two disagree.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
