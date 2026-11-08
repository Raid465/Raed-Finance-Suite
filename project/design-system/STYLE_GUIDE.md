# Raed Finance Suite UI Style: Clean Light

Light, calm financial dashboard. White cards on a soft grey page, one blue
accent, green and red only for gains and losses. No glassmorphism, large
gradients or blur.

## Core tokens (see `tokens.css`)
- Page: `#f6f7f9`
- Surface (metric tiles): `#f1f3f6`
- Card / input: `#ffffff`
- Border: `#e3e6eb`
- Text: `#1a1f2b`
- Muted text: `#5b6472`
- Primary blue: `#2563eb` (hover `#1d4ed8`)
- Success (gain): `#15803d`
- Danger (loss): `#dc2626`
- Warning: `#b45309`
- Second comparison series: `#ea580c`
- Radius: 6 / 8 / 12 px

## Rules
1. English is the default language on every fresh page load.
2. Arabic remains available via a language toggle and switches to RTL.
3. Cards are white with a 1px border and at most a very soft shadow.
4. Primary actions use blue with white text; green/red are reserved for financial status.
5. Focus states use a 2px blue outline for keyboard accessibility.
6. Text on white must use the text or muted tokens, never light pastel colors.
