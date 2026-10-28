# Competitor-Survey

Aplikasi survei kompetitor (React + Vite) dengan backend Google Apps Script + Google Sheets.

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # vitest
npm run build
```

## Deploy

- **Frontend (Vercel):** otomatis. Push ke `main` → production (competitor-survey.vercel.app); push ke branch lain → preview URL.
- **Backend (`gas/Code.gs`):** manual. Tempel ke Extensions → Apps Script, lalu Deploy → Manage deployments → Edit → *New version* (URL tetap sama).

Dokumentasi audit & roadmap ada di folder [`docs/`](docs/).
