# Approved sketchbook system

Source of truth: `mockups/01-today.png`. Implement the approved layout rather than introducing a new direction.

## Tokens

Paper `#F7F5EE`, navy ink `#202236`, cobalt `#3530C8`. Mood fills: calm blue `#C8DCE5`, fun lime `#DCEAAE`, messy lavender `#D4CEE9`, intense gray `#C8CED8`.

Kalam light/regular for handwriting; Space Mono regular for readable journal text and labels. All text remains live and editable, never baked into an image.

## Rules

- Light paper with restrained grain. No glossy gradients, glass, heavy shadows or stock UI icon packs.
- Shared 64-unit custom SVG icon grid, rounded navy fineliner strokes; filled cobalt home only for the active page.
- Wobbly outlined note/action frames and pastel mood stamps. Cobalt outline, not color alone, marks the selected mood.
- Calm spacing, lowercase conversational copy, subtle pressed opacity. No ornamental entrance animation.
- Mobile-first, safe-area-aware; maximum 480px paper width on desktop, content scrolls on smaller devices.
- Keep controls at least 44px (48px for icon-only native actions), readable contrast, accessible names and states, and visible keyboard focus.

## Today hierarchy

Handwritten Today heading + moon → device date → four moods → daily note + attachments → real saved week → primary save button → four-item navigation shell.

## Implemented pages

Onboarding, Today, month/year calendar, memory detail/editor, camera, search, rewind, month recap, time capsules/capsule memory, settings, personalization, about, and not-found recovery. All use the same tokens and sketch components.

The UI/UX checklist guides safe areas, labels, selected states, visible feedback, minimum touch sizes, scrollable layouts and reduced motion. The paper design intentionally uses light mode only; there is no untested dark palette. Real-device Dynamic Type, keyboard, biometrics, reminders, camera and microphone still need native device verification.

Mockup memories are design references only. Live calendars and charts are populated exclusively from the user's saved entries. Screenshots in `live/` use isolated test profiles, not the user's journal.
