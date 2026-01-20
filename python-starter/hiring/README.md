# Hiring Process Simulator (Candidate + Recruiter)

Static, no-server hiring simulator designed for classrooms:

- **Candidate Mode:** Profile → Aptitude → Coding → HR → Result
- **Recruiter Mode:** Drag/drop pipeline (Applied → Aptitude → Tech → HR → Offer)
- **Dashboard:** Scorecards + quick analytics

## Run locally

Use VS Code **Live Server** (recommended).

1. Open folder `hiring-sim`
2. Right click `index.html` → **Open with Live Server**

## Customize questions

Edit JSON files in `data/`:

- `data/aptitude.json`
- `data/coding.json`
- `data/hr.json`

## Notes

All data is stored in `localStorage` in the user's browser.
