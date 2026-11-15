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

## 2026-11-15 — Dream Gardens design-pack direction

User explicitly approved Oliver Schurmann’s Bord Bia Bloom Easy Care Garden PDF as the product and visual reference, and asked to implement the features and design style. Continued draft PR #1 on the existing branch.

Implemented:
- Original cream-paper, botanical-green editorial design studio, accessible from Home, Plan and zone tools; four distinct style directions with original schematic illustrations (not finished garden renders).
- Per-zone saved site briefs: light, drainage, exposure, aspect, pH notes, survey provenance, native preference and family-use flag. Recorded conditions produce palette mismatch/unknown notices; native preference filters starter entries. No claim of validated horticultural matching.
- Coordinated starter palettes, placement of each selected plant group through the existing editor, labelled saved-feature map/list, supplied pot-size/specification entries, source references and quantities. Existing geometry and garden records remain unchanged.
- Zone shopping/cost view linked to the same saved features; quote-edit handoff, CSV shopping-list export, whole-garden budget link. Print combines all five design-pack sections using browser Print/Save as PDF.
- Furniture/planter item placement, unit pricing and moving saved features by tapping a new first-point position. Existing deletion/copy/mirror tools retained.
- Persistent staged work checklist and general seasonal guidance linked to existing jobs.
- Narrow zone-designer API to preserve owner isolation, failed-read/write protections and extra document fields.
- Updated the existing daily automation brief with this approved direction and explicit remaining priorities.

Validation: syntax checks on changed JS; map-navigation, zone-storage and new design-pack bridge regressions pass; git diff --check. Real browser guest preview opened using managed sites-preview / cloud browser. Visually inspected design collection and navigated all five sections; saving a guest site brief showed “Site brief saved.” No authenticated garden, live Supabase, device/Safari, feature-positioning or print/download end-to-end verification. Local preview setup is ignored and not part of the commit.

Remaining limits / next work: live supplier price scanning has no connected pricing service; rates are explicitly manual. Illustrative starter spacing is not verified mature spread; plant-by-plant suitability/hazards and nursery availability need authoritative checks. Native flag is a preference filter, not a full site recommendation engine. Family-use flag is recorded, not an automatic toxicity exclusion. Small-border templates are coordinated palettes placed group-by-group, not automatic fit-to-bed layouts. General seasonal text is not per-species recurring scheduling. Actual survey dimensions remain unverified against authorized Supabase records. Proposed features remain browser-local and shared within the current workspace, not separate per design idea or cloud-synced. Add richer landscape imagery only as clearly separated concepts. Keep 3D deferred. No merge/deployment/database changes.

## 2026-11-15 — Reduce screen density; follow the PDF's information hierarchy

User said the live screen contained too much and asked to take information from the PDF for the app layout. Visually reviewed PDF pages 5 and 8: clear teal heading, dominant garden/planting plan, compact numbered key and separate plant information. Applied that hierarchy rather than adding another dashboard.

- Home: shorter heading, one main map action; vision edits and other ideas collapsed. Legacy Plan checklist/notes collapsed.
- Studio: removed large promotional masthead and five-button tab bar. Compact section selector with Back/Next; one chosen style shown at a time; print/map controls and source/storage notes tucked into details.
- Added a separate Garden Plan page with a large recorded map and compact numbered key. Planting Plan leads with the map/key; palette selection and supplied-size tables expand on demand. White space, teal headings/rules and muted pink numbered markers reflect the reference without copying illustrations.
- Map: dimensions off initially; reduced duplicate Fit/season controls; tools hidden under Add to this zone and Manage design. Budget and guide remain in Manage design.
- Existing data, pricing and storage behavior retained. Actual signed-in survey/Supabase and phone checks remain required.

Validation: JS syntax checks, existing map-navigation, zone-storage and design-pack bridge suites, and git diff --check passed. User's earlier instruction to make it live applies to this layout correction.
