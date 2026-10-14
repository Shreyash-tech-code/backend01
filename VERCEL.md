# Deploying the API to Vercel

## 1. Import the correct folder

Import this repository into Vercel with `backend01` selected as the project root. If the repository contains multiple applications, set the Vercel **Root Directory** to `backend01`.

Vercel detects [`api/index.ts`](./api/index.ts) automatically. No custom start command is required.

## 2. Add production environment variables

In Vercel, open **Project Settings > Environment Variables** and add:

- `MONGODB_URI`: a valid MongoDB Atlas connection string. In Atlas, add Vercel's outbound access as permitted by the project's network access policy.
- `CORS_ALLOWED_ORIGINS`: the exact frontend URL(s), separated by commas.
- `LLM_PROVIDER`, `LLM_MODEL`, and the API key required by that provider.
- `LLM_TIMEOUT_MS` (optional; defaults are handled by the application).

Do not upload `.env`; it is ignored by Git. Use [`.env.example`](./.env.example) as the variable-name reference.

## 3. Deploy

Use the Vercel dashboard or run:

```powershell
npm install -g vercel
vercel
```

The API is available at:

- `/`
- `/api/health`
- `/api/brands`
- `/api/detection`

The health endpoint reports `503` with `database: "disconnected"` until MongoDB is reachable. This is an application health result, not a Vercel deployment failure.
