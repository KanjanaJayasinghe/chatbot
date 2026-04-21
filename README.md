# CoastAI Chatbot

A production-ready CSV-powered chatbot built with **Next.js 14**, **Firebase Firestore**, **Google Gemini AI**, and **Tailwind CSS**.

## Stack
- Framework: Next.js 14 App Router + TypeScript
- Styling: Tailwind CSS
- AI: Google Gemini gemini-1.5-flash (free tier)
- Database: Firebase Firestore
- CSV parsing: PapaParse

## Project Structure
```
app/api/chat/route.ts        Firestore search + Gemini streaming API
app/components/              Chat UI components
app/page.tsx                 Main chat page
lib/firebase.ts              Firebase client SDK
lib/firebase-admin.ts        Firebase Admin SDK (server-side)
lib/gemini.ts                Gemini AI client
scripts/uploadCSV.ts         One-time CSV uploader
data/dataset.csv             YOUR CSV (gitignored)
types/index.ts               Shared types
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.local.example` to `.env.local` and fill in:
- `GEMINI_API_KEY` — from Google AI Studio (https://aistudio.google.com/app/apikey)
- `NEXT_PUBLIC_FIREBASE_*` — from Firebase Console > Project Settings > Your apps
- `FIREBASE_ADMIN_SDK_KEY` — Firebase Console > Project Settings > Service Accounts > Generate new private key (paste the JSON as a single-line string)

### 3. Enable Firestore
In Firebase Console, enable Firestore Database in Native mode.

### 4. Upload your CSV
Place your CSV at `data/dataset.csv`, then run:
```bash
npx ts-node --project tsconfig.scripts.json scripts/uploadCSV.ts
```

### 5. Start dev server
```bash
npm run dev
```
Open http://localhost:3000

## Deployment (Vercel)
1. Push to GitHub
2. Import repo at vercel.com/new
3. Add all env vars from .env.local in the Vercel dashboard
4. Deploy

> FIREBASE_ADMIN_SDK_KEY must be a single-line JSON string in Vercel env vars.
