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

## 2026-11-16 — Replace the active experience with a measured plan studio

Latest user direction supersedes prior deferred-3D/dashboard roadmap: basic flat 2D established geometry, coloured plant symbols and labels, each section with its own 3D illustration. Replaced active garden-ui/design-studio entry points with plan-studio.js/css. Legacy modules remain in git for recovery but are not loaded by index.html. Existing authentication, survey loading, plant records, protected zone storage and editing remain. No database writes or schema changes.

The new shell opens on the map; section dropdown, 2D/3D switch, plant key and edit drawer are the only main UI. Saved survey polygons remain unchanged. Existing plants expose their loaded records for symbolic display; colour is stable per species. Section preview projects the measured ground outline and saved existing/proposed positions with illustrative heights. This is a fixed axonometric SVG illustration, not photorealistic 3D or measured plant-height data. Paths and beds use saved points; planting groups use one symbolic group marker, not individual mature canopy footprints. No fabricated garden shown when the survey is unavailable.

Checks: changed script syntax checks, existing map-navigation, zone-storage and design-pack bridge suites pass; git diff --check. Browser guest tested replacement shell and edit drawer. Authenticated survey, real garden rendering and Safari/device checks remain unverified. Old automation brief should not reintroduce dashboard/recipe/large design-pack screens; this user instruction takes precedence over it.

## 2026-11-18 — Match proposed planting layouts across plan and section views

Inspected main `4f0c31a`, active plan/editor scripts, this log and open draft PRs #2/#3 (no review comments); no applicable AGENTS.md found in the checkout or ancestors. New branch `codex/matching-planting-layout` addresses proposed planting display, separate from #2's unconnected botanical prototype and #3's navigation handoff. The shared zone API/cache-version files also appear in #3; retain both API additions and the newest cache version when reviewing together.

Extracted the existing editor's group-grid and polyline-hedge positions into a read-only `plantingPositions()` helper. Editor artwork, flat plan symbols and projected section plants now share that calculation rather than collapsing each proposed group to its first saved point. Use one species/quantity label per group and suppress duplicate editor planting artwork only within the active plan studio. Existing survey transform, saved plant positions, group spacing/count and the prior 200-symbol rendering cap remain; malformed/incomplete proposed layouts produce no guessed positions or data writes. Heights/forms remain explicitly illustrative. No persistence changes, dashboards or new main-interface panels.

Verified: syntax checks for all root scripts/tests; map-navigation, zone-storage, design-pack bridge and new planting-layout suites; `git diff --check`. The new test executes the real editor API and plan-studio script against synthetic Node DOM/SVG fixtures. It checks known grid/bent-hedge positions, degenerate routes, invalid-data guards, unchanged existing-plant Y transform, matching projected ground positions, grouped labels, and a saved group move while retaining unknown fields. It fails against main's old plan-studio at the missing individual positions. No real garden measurements were used or invented for the tests.

Blocked/unverified: Playwright/Chromium still fails to launch (`process_singleton_posix.cc:297`, `socket() failed: Operation not permitted`). No browser/visual, signed-in garden, live Supabase, phone performance, saved-reload or Safari verification. Before merge, compare a test group's/hedge's members in both views, move the group, reload and check labels/positions on desktop and iPhone. Do not alter production records merely to test.

Next: verify signed-in rendering and phone readability; audit saved existing row/group records and missing-coordinate handling before changing their display. Keep the basic plan plus separate section illustrations, and never infer missing survey dimensions or measured plant heights. No merge or deployment performed.

## 2026-11-19 — Do not turn missing saved plant coordinates into zero

Inspected main `4f0c31a`, applicable instructions (no AGENTS.md in checkout/ancestors), current log and open PRs #2–#4. Continued the relevant plan-accuracy branch/PR #4 rather than creating overlapping plan-renderer work; its review discussion is empty. PRs #2/#3 remain separate.

Added `garden-coordinates.js`, loaded before app.js, with a shared read-only saved-plant conversion. Null, blank, boolean, object/array and non-finite values are unplaced instead of becoming zero/NaN. Actual numeric zero, numeric strings and decimals retain the established `7000 - y_cm` transform. Both the underlying saved-plant marker and the active plan/section entries use it, so no invisible interactive marker remains at a guessed location. The existing compact plan/illustration notes report how many non-removed records need coordinates. All records/unknown fields stay intact; this is display filtering, not data repair/deletion. Survey geometry/plant heights are unchanged.

Verified: all root/test JS syntax; five suites (map-navigation, zone-storage, design-pack bridge, planting-layout, garden-coordinates); `git diff --check`. Synthetic tests exercise the actual app marker function and plan studio, missing coordinates in both views, genuine zero/decimal positions, notice clearing, unchanged records and unknown fields. The marker regression fails against the pre-change app. No real measurements, sessions or secrets were used in tests.

Blocked: Chromium launch still fails with `socket() failed: Operation not permitted`; no visual, signed-in garden/Supabase, real phone/Safari or saved-reload verification. Before merge, confirm missing-coordinate records are counted but not plotted, and a genuine zero-coordinate test plant still appears. Do not edit production records solely for testing.

Next: validate incomplete survey rows consistently before rendering measured section outlines, then audit existing saved row/group records. Continue the basic 2D plan plus separate illustrative section views; no dashboards, schema changes, merge or deployment.

## 2026-11-20 — Withhold incomplete supplied survey outlines consistently

Inspected main `4f0c31a`, open PRs #2–#4, this log and applicable instructions (no AGENTS.md found in checkout/ancestors). Continued plan-accuracy PR #4 on its existing branch; no review comments. Other PR scopes remain botanical prototyping and touch navigation.

Added a shared read-only survey normalizer used by app.js polygon drawing and the active section illustration. A section with missing/non-finite coordinates or order, duplicate order values, fewer than three distinct vertices, or zero/non-finite signed area is withheld as a whole. Do not drop a bad vertex and connect its neighbours into a different outline. Unaffected sections render normally. Actual zero coordinates, numeric strings, distinct fractional ordering and explicit closing vertices remain supported. Raw rows/unknown fields remain untouched. Compact notices distinguish incomplete survey data from a section that has not loaded. Script versions refreshed; established transform and plant forms/heights unchanged.

Verified: syntax checks for all root/test JavaScript, six Node suites (including new survey-outline tests), and `git diff --check`. Tests execute actual drawGarden and plan-studio paths with synthetic fixtures: whole-section rejection, valid-section isolation, projected outline removal/recovery, sorting without raw-data mutation and zero/closing-vertex handling. The 2D regression fails against the pre-change renderer. These checks validate supplied records, not survey accuracy/completeness against an external source; an entirely missing vertex cannot be inferred without authoritative measurements.

Blocked/unverified: local Chromium launch again fails with `socket() failed: Operation not permitted`. No visual, signed-in garden/Supabase, device/Safari or saved-reload verification. Before merge, use a separate test fixture to compare incomplete and restored section outlines in both views. No production records were edited.

Next: signed-in comparison against actual stored survey measurements when authorized access is available, then inspect existing saved row/group rendering. Keep the basic plan/section interface; no dashboards, data/schema writes, merge or deployment.

## 2026-11-21 — Keep proposed-plan read failures visible in the active studio

Inspected main `4f0c31a`, open PRs #2–#4, this log and instructions (no applicable AGENTS.md in checkout/ancestors). Continued relevant plan/data-accuracy PR #4; review discussion remains empty. Saved row/group persistence is still incomplete in the existing app; do not invent endpoints or new database fields to reconstruct it.

Fixed an active-studio failure state: snapshot errors were written into the measurement notice, then overwritten by the normal plan caption. Added one compact accessible warning above either view and a read-only Retry loading button. Each plan-studio render uses one snapshot, so repeated reads cannot hide a transient failure or mix available and unavailable proposed layouts in that render. Existing plant data remains available; the warning explicitly says the view may be incomplete. Successful retry clears it and restores proposed planting. No storage format, geometry, plant form/height or write path changed; script/style versions refreshed.

Verified: all root/test JS syntax, six Node regression suites and `git diff --check`. Expanded the actual plan-studio/editor fixture to cover corrupted storage in 2D/section views, one-off denied reads, persistent role=alert state, restoration in both views, zero retry writes and exact retention of the saved document/unknown fields. Regression fails against the pre-change studio. Tests use synthetic records and minimal DOM/SVG fixtures, not a real browser.

Blocked/unverified: Chromium still fails to launch (`socket() failed: Operation not permitted`). No visual, signed-in garden/Supabase, phone/Safari or saved-reload verification. Before merge, test a read failure only in a disposable local fixture, inspect the warning/read-only retry on desktop and phone, and compare recovered positions. No production records changed.

Next: signed-in survey/plant comparison when authorized access is available; audit safe persistence of existing row/group data before changing its display. Keep the basic plan plus section illustration interface. No dashboards, schema changes, merge or deployment.

## 2026-11-22 — Preserve unknown point fields during feature transformations

Inspected main `4f0c31a`, current development notes, open PRs #2–#4 and instructions (no applicable AGENTS.md found in checkout/ancestors). Continued related proposed-layout/data-safety PR #4; no review comments. This does not duplicate #3's pointer-navigation fix.

Move, copy and mirror previously replaced each saved point with only x/y, silently dropping any additional fields. Each transformation now retains the point's other fields before overriding the coordinates it changes. Existing translation/reflection calculations, bounds checks, feature IDs/copy semantics and persistence protections remain. Refreshed the editor script version. No new measurements, schema fields, interface panels or write operations introduced.

Verified: all root/test JS syntax; seven Node regression suites; `git diff --check`. The new test executes the actual editor copy/mirror functions and move click handler using synthetic storage/map fixtures. It checks exact coordinates, retained nested point/feature/document fields, unchanged originals for copies and mirrors, and zero writes for rejected placements. The baseline copy operation fails this metadata regression. No live records or survey measurements were used.

Blocked/unverified: Chromium launch still fails with `socket() failed: Operation not permitted`; no browser/visual, signed-in garden/Supabase, phone/Safari or saved-reload verification. Before merge, use a disposable plan with extra point metadata to move/copy/mirror/reload and compare its saved document. No production records changed.

Next: authorized signed-in comparison and existing row/group persistence audit; inspect other document replacements for unknown-field loss. Keep the basic flat plan and separate illustrative section views. No merge/deployment/schema changes.

## 2026-11-23 — Use loaded section geometry when native SVG hit-testing fails

Inspected main `4f0c31a`, current notes/instructions and open PRs #2–#4; no applicable AGENTS.md in checkout/ancestors. Continued relevant geometry/data-safety PR #4 (empty review discussion), separate from #3's navigation work.

The editor previously returned true for every point if isPointInFill/DOMPoint failed; the studio guessed membership from the saved zone label. Added shared containment: native SVG testing where available, otherwise ray-cast the actual displayed polygon vertices with boundary points included. Concave outlines use their actual shape, not a bounding rectangle. Missing/invalid geometry rejects the point. Both editing and section filtering use it. Existing coordinates, records and unknown fields remain untouched; cache versions refreshed. No invented dimensions or new interface panels.

Verified: all root/test JS syntax, eight Node suites and `git diff --check`. New synthetic tests cover missing/throwing/native SVG APIs, concave and reversed outlines, boundary points and invalid geometry. Actual editor guard/move-handler tests reject an outside write and retain valid inside movement; the baseline guard fails. Plan-studio tests verify geometry-based membership despite incorrect/missing zone labels. These are numeric/DOM/SVG fixtures, not browser tests.

Blocked/unverified: Chromium launch still fails (`socket() failed: Operation not permitted`); no visual, real Safari/touch, signed-in garden/Supabase or saved-reload verification. Before merge, compare inside/outside and edge taps in a disposable measured-section fixture on phone and desktop. No production data was changed.

Next: authorized signed-in geometry comparison, Safari gesture/containment checks and existing row/group persistence audit. Keep the basic plan and separate illustrative section views. No merge/deployment/schema changes.

## 2026-11-24 — End unfinished placement when leaving the edit drawer

Inspected main `4f0c31a`, current notes/instructions and open PRs #2–#4; no applicable AGENTS.md found in checkout/ancestors. Continued relevant active-studio/data-safety PR #4 (no review comments). This adds editor-session cleanup, not #3's pointer-navigation change.

The Edit plan/Done editing toggle previously hid tools while retaining active drawing/move state. Added an explicit cancel API that clears only transient mode, points and selection, redraws saved features and reports an unfinished placement cancellation when needed. Closing the drawer or switching to 3D calls it and resets the toggle label. Saved features/unknown fields, geometry and persistence are unchanged; cancellation never saves. Cache versions refreshed; no new main-interface panels.

Verified: all root/test JS syntax, nine Node regression suites and `git diff --check`. Actual API tests cover drawing/move state cleanup and zero storage writes. Studio fixture tests cover drawer close and 3D/2D transitions with an unchanged saved document. Pre-change API/studio code fails the new regressions. Corrected the minimal test DOM's descendant-ID removal to match real element replacement; no browser verification is implied.

Blocked/unverified: Chromium still fails to launch (`socket() failed: Operation not permitted`). No visual, real Safari/touch, signed-in garden/Supabase or saved-reload verification. Before merge, start an unsaved path/move in a disposable fixture, close editing or switch views, then ensure later taps cannot complete it and saved features remain intact.

Next: authorized signed-in geometry comparison, Safari touch checks and existing row/group persistence audit. Keep the basic 2D plan and separate illustrative section views. No merge/deployment/schema changes.
