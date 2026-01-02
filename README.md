# project-practicum

React + TypeScript storefront powered by Firebase (Auth, Firestore) and Vite.

## Quick Start (Clone & Run)

- Prerequisite: Node.js 18+
- Clone the repo:

```bash
git clone https://github.com/somnang190405/project-practicum.git
cd project-practicum
```

- Install deps and start dev server:

```bash
npm install
npm run dev
```

- Build for production:

```bash
npm run build
npm run preview
```

## Environment Variables

Copy [.env.example](.env.example) to `.env` and fill in values. `.env` is ignored by git.

Required for Firebase (Web App settings):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Optional (Payment / ABA KHQR):

- `VITE_PAYMENT_PROVIDER_NAME` (display only)
- `VITE_PAYMENT_MERCHANT_NAME` (display only)
- `VITE_ABA_KHQR_BASE_PAYLOAD` (raw EMV/KHQR string, starts with `000201...`)

Restart the dev server after editing `.env`.

## Notes

- If Firebase config isn’t set, some features (Auth, Orders, Wishlist) won’t work.
- Admin access is controlled via `VITE_ADMIN_EMAILS` (comma-separated allowlist). If not set, all users are customers.
