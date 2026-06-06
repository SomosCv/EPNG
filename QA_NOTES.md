# QA Notes

Checked during generation:

- Client-specific content is isolated under `clients/emergency-preparedness-knoxville/`.
- No legacy client text is present in generated app files.
- Manifest icon paths are relative to the manifest file: `assets/icons/icon-192.png` and `assets/icons/icon-512.png`.
- Original PDF is included only as a supplemental asset/download, not as the main interface.
- Emergency Mode includes the seven implementation steps from the guide.
- Ready Kit checklist includes the page 12 supply list.
- Phone numbers and resources from pages 16-18 are searchable cards.

Recommended before deployment:

- Run Lighthouse PWA/accessibility audit.
- Test service worker over HTTPS.
- Verify Spanish copy with a human translator.
- Replace generated placeholder logo/background with approved client assets if needed.
- Conduct manual keyboard and screen-reader testing.


## Offline/PWA QA

Run this before calling the app production-ready.

1. Start a local server.
2. Open the app online.
3. Wait for the service worker to install.
4. Open DevTools → Application → Service Workers.
5. Confirm the service worker is active.
6. Open DevTools → Application → Cache Storage.
7. Confirm the cache contains:
   - index.html
   - core/app.js
   - core/styles.css
   - active-client.json
   - client config.json
   - client theme.css
   - client manifest.json
   - en.json
   - es.json
   - cards.json
   - sections.json
   - checklists.json
   - flows.json
   - roles.json
   - resources.json
   - logo
   - background image
   - icons
   - original PDF
8. Turn on Offline mode in DevTools.
9. Refresh the app.
10. Confirm these screens still load:
   - Home
   - Start Here
   - Household Preparedness
   - Household Ready Kit
   - Build Neighborhood Plan
   - Emergency Mode
   - Team Roles
   - Local Hazards
   - Resources
11. Toggle Spanish while offline.
12. Toggle text size while offline.
13. Toggle dark mode while offline.
14. Check and uncheck Ready Kit items while offline.
15. Save a Neighborhood Plan while offline.
16. Refresh while still offline.
17. Confirm saved checklist and plan data persist.
18. Open the original PDF link while offline.

## Accessibility QA

1. Confirm the skip link appears on keyboard focus.
2. Confirm Tab order is logical.
3. Confirm every button has visible focus.
4. Confirm the current screen is reachable by keyboard.
5. Confirm bottom navigation buttons are keyboard accessible.
6. Confirm color contrast passes WCAG AA.
7. Confirm text-size toggle does not break layout.
8. Confirm dark mode does not reduce contrast below AA.
9. Confirm screen reader does not announce the entire app after every click.
10. Confirm the toast/status message still announces short save/reset confirmations.
11. Confirm all images have useful alt text or empty alt text when decorative.
12. Confirm form labels are programmatically associated with their fields.
13. Confirm Spanish mode sets `<html lang="es">`.
14. Confirm English mode sets `<html lang="en">`.

## Language switcher and icon QA

1. Confirm the language control is a real select element, not a two-language hardcoded toggle.
2. Confirm the language list comes from `config.json` and supports future clients with more than two languages.
3. Confirm an invalid saved language falls back to the configured default language.
4. Confirm missing translation keys fall back to the default language dictionary.
5. Confirm changing language updates `<html lang>` and persists after refresh.
6. Confirm Font Awesome icons render in home cards, bottom navigation, action buttons, resources, roles, and hazard cards.
7. Confirm icons are decorative with `aria-hidden="true"` and do not create noisy screen reader output.
