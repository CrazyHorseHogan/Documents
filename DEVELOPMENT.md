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
