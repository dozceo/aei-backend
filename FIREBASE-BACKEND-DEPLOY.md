# Backend Deployment Runbook (Cloud Run + Firebase Auth)

Recommended production target for this API is Cloud Run in the same Google Cloud project as Firebase.

## 1. Prerequisites

- Google Cloud project linked to Firebase.
- `gcloud` CLI installed and authenticated.
- Required APIs enabled:
  - Cloud Run
  - Cloud Build
  - Artifact Registry
- Service account with permissions for deploy + Secret Manager.

## 2. Required runtime env vars

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (recommended via Secret Manager)
- `FIREBASE_DATABASE_URL` (if required by your setup)
- `CORS_ORIGIN` (comma-separated list including hosted frontend origin)
- `NODE_ENV=production`

Optional:

- `PORT` (Cloud Run sets this automatically)
- `ML_SERVICE_URL`

## 3. Build and deploy

From backend repo root:

```bash
gcloud config set project <PROJECT_ID>
gcloud builds submit --tag gcr.io/<PROJECT_ID>/sankalp-backend
gcloud run deploy sankalp-backend \
  --image gcr.io/<PROJECT_ID>/sankalp-backend \
  --region <REGION> \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,CORS_ORIGIN=https://<YOUR_FRONTEND_DOMAIN>
```

Use Secret Manager for service-account JSON instead of plain env where possible.

## 4. Firebase token verification path

- Frontend sends `Authorization: Bearer <ID_TOKEN>`.
- `src/server/middleware/auth.ts` verifies token using Firebase Admin.
- User context (`uid`, `role`, `roles`) is attached to request.

## 5. Set role claims for users

After creating Firebase users, set role claims:

```bash
npm run auth:set-claims -- <firebase_uid> <STUDENT|TEACHER|PARENT>
```

## 6. Post-deploy checks

1. Hit `GET /health` and `GET /api/version`.
2. Confirm CORS allows your App Hosting origin.
3. Login from frontend and call a protected backend route.
4. Verify unauthorized calls return 401 without bearer token.