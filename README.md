# BMe Productivity Calculator

Mobile-first installable web app (PWA) recreated from the workbook **BMe productivity rates OFFLINE vs INLINE iX3200 V2 SE edits.ods**.

## Included calculators
- Inline vs Offline comparison (12 x 18 input-sheet scenario)
- BMe Inline with iX3200
- BMe Offline

## Run locally
Any static web server works. Example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy
This folder can be dropped into Vercel, Netlify, GitHub Pages, or any basic web host. HTTPS hosting enables the full installable PWA experience.

## Workbook behavior
- 4 pages per input sheet
- Default set interval: 0.8 sec
- 60 sec/min
- 30-day month
- Offline 9 x 12 (LEF) preserves the workbook's 3.33 sheets/sec downstream calculation even though that differs from 251.85 sheets/min.
- Shift/day/month are recalculated from the selected format's actual Books per Hour. This fixes obvious copied-cell reference errors in a few workbook cells.
