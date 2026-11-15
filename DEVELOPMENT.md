# GardenDex development

The active application is in CrazyHorseHogan/Documents, main branch. CrazyHorseHogan/GardenDex is empty. The daily development automation now targets Documents.

## 2026-11-14 — Map touch reliability

Branch: codex/map-touch-reliability. Keep changes for review; do not merge or deploy automatically.

- Delay explicit pointer capture until a drag so ordinary plant marker clicks retain their targets.
- Use a gesture-start SVG inverse transform for stable pan and pinch calculations.
- Support translating the pinch centre and continuing to pan with the remaining finger.
- Suppress post-gesture clicks at window capture before zone-designer's earlier map click listener can create an unwanted design point.
- Clean up cancelled/lost pointers, ignore capture transfers from child markers, and reset on window blur or leaving garden view.
- Refresh map-navigation.js query version in index.html.

Validation: `node --check map-navigation.js` and `node tests/map-navigation.test.cjs` passed. The regression suite fails against the original navigation on premature tap capture. Tests use an SVG/event fixture, not a real browser. Chromium testing was attempted but could not launch because the runtime denied its process socket operation. No live garden/Supabase data was changed or validated.

Before merge: test on an actual iPhone/Safari and desktop browser: tap a plant, drag from a plant and from empty ground, pinch and move both fingers, lift one finger and continue panning, draw paths/plant groups without an extra point after pinching, cancel a gesture, change zones, use Fit and zoom buttons. Confirm dimensions remain intact.

Next: verify these interactions in the real app; then inspect save/load reliability and survey dimensions using authorized access. Keep 3D deferred. Review existing work before creating another branch or duplicate PR.

## 2026-11-15 — Protect zone plans after storage read failures

Continued `codex/map-touch-reliability` / draft PR #1 to avoid overlapping reliability branches. Inspected main, the open PR and its empty review discussion, this log and the master job board. No applicable AGENTS.md was present in the checkout or its ancestor directories.

- Zone-design reads distinguish a missing record from invalid JSON, an invalid document structure or unavailable storage. Keep the stored value intact and block saves after failed reads, including a one-off failure that clears before the write.
- Show a persistent recovery notice with Retry loading. Block the budget view and export while the saved plan cannot be read, rather than showing/exporting an empty plan. Retry does not reset storage.
- Preserve additional document fields during successful saves. Refresh the zone-designer script version.
- Scope: browser-local zone plans only; other workspace stores still need a similar audit. No survey dimensions, Supabase records or schemas changed. 3D remains deferred.

Validation run: `node --check` on all app JavaScript files and both test files; `node tests/zone-storage.test.cjs`; `node tests/map-navigation.test.cjs`; `git diff --check`. All passed. Storage tests execute the actual editor script in a minimal DOM/storage fixture: existing-feature round trip, missing versus damaged records, denied reads (persistent and one-off), failed writes, recovery, owner isolation and blocked empty exports.

Blocked/unavailable: Chromium/Playwright could not launch (`process_singleton_posix.cc:297`, `socket() failed: Operation not permitted`). No visual, phone, Safari or live Supabase verification was performed. The earlier device interaction checklist remains required before merge. Storage UI checklist: corrupt a test-only guest zone record; confirm the recovery notice, blocked budget/save/export and unchanged raw value; restore that fixture and Retry loading; confirm the original features return. Never corrupt an actual user plan for testing.

Next priority: real-device navigation/zone-selection checks, then audit the remaining browser-local stores and authenticated garden load failures. Verify dimensions only from actual stored survey measurements using authorized Supabase access. Do not invent missing measurements, merge or deploy.
