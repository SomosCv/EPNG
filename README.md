# Emergency Preparedness Neighborhood Guide PWA

A mobile-first, white-label progressive web app converted from the Emergency Preparedness Neighborhood Guide PDF.

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## What this includes

- Task-based app screens instead of one page per PDF page.
- Household preparedness checklist.
- Household Ready Kit persistent checklist.
- Neighborhood Plan Builder saved locally in the browser.
- Emergency Mode with all seven implementation steps.
- Team role descriptions.
- Local hazards screen.
- Searchable phone numbers and resources.
- Light/dark mode.
- Text size toggle.
- English/Spanish UI toggle.
- PWA manifest and service worker.
- Original PDF included as a supplemental download.

## White-label structure

Core app logic lives in `core/`. Client-specific content, theme, language, data, and assets live in `clients/emergency-preparedness-knoxville/`.

## Accessibility notes

The app uses semantic sections, real buttons/links, visible focus states, a skip link, large touch targets, reduced-motion support, and persistent text-size controls. Continue full Section 508/WCAG testing with screen readers and automated tools before public launch.
