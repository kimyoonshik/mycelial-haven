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
