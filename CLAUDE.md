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
