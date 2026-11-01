# School Timetable: frontend (React and TypeScript)

Built with Vite. It talks to the Django backend over a JSON API.

## Run locally

```bash
cp .env.example .env        # set VITE_API_URL to your backend, for example http://localhost:8000
npm install
npm run dev                 # http://localhost:5173
```

Other scripts: `npm run build` (production build into `dist/`) and `npm run typecheck`.

## Colours

All colours are CSS variables at the top of `src/styles.css`. Change them there.

## Deploy on Vercel

1. Push this folder to its own GitHub repository.
2. In Vercel choose Add New Project and import the repository. Vercel detects Vite.
3. Under Environment Variables add `VITE_API_URL` with your backend URL, for example
   `https://school-timetable-api.onrender.com`, with no trailing slash.
4. Deploy. Copy the resulting URL into the backend variable `CORS_ALLOWED_ORIGINS`.
