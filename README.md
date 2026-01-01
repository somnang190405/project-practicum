# project-practicum

React + TypeScript storefront powered by Firebase (Auth, Firestore, Storage).

## Local Development

- Prerequisite: Node.js 18+
- Install dependencies: `npm install`
- Start dev server: `npm run dev`

## ABA Pay / KHQR QR Setup (Scannable QR)

The Payment page can generate a real EMV/KHQR payload QR (scannable in ABA Pay) with the correct order amount.

- Copy [.env.example](.env.example) to `.env`
- Set `VITE_ABA_KHQR_BASE_PAYLOAD` to your **raw KHQR payload string** (usually starts with `000201...`)
- Restart the dev server: `npm run dev`

Environment variables are not committed. If needed, create a local `.env` and configure your Firebase web app settings in the code or via env vars accordingly.
