/**
 * One-time script to upload a CSV file to Firestore.
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/uploadCSV.ts
 *
 * Place your CSV at ./data/dataset.csv before running.
 */

import * as fs from "fs";
import * as path from "path";
import * as admin from "firebase-admin";
import Papa from "papaparse";
import * as dotenv from "dotenv";

// Load .env.local for FIREBASE_ADMIN_SDK_KEY
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ── Firebase Admin init ────────────────────────────────────────────────────────
const serviceAccountRaw = process.env.FIREBASE_ADMIN_SDK_KEY;
if (!serviceAccountRaw) {
  console.error("❌  FIREBASE_ADMIN_SDK_KEY is not set in .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw) as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.projectId,
});

const db = admin.firestore();

// ── CSV Parsing ────────────────────────────────────────────────────────────────
const csvPath = path.resolve(__dirname, "../data/dataset.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`❌  CSV file not found at: ${csvPath}`);
  console.error("    Create the folder and add your file: data/dataset.csv");
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, "utf-8");

const parseResult = Papa.parse<Record<string, string>>(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
});

const rows = parseResult.data;
const errors = parseResult.errors;

if (errors.length > 0) {
  console.warn("⚠️  CSV parse warnings:", errors.slice(0, 5));
}

console.log(`📄  Parsed ${rows.length} rows from ${csvPath}`);

// ── Upload to Firestore ────────────────────────────────────────────────────────
const COLLECTION = "dataset";
const BATCH_SIZE = 499; // Firestore max batch size is 500

async function uploadRows(rows: Record<string, string>[]) {
  let uploaded = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (let j = 0; j < chunk.length; j++) {
      const row = chunk[j];
      const rowIndex = i + j + 1;

      // Build searchText: field names + values joined as lowercase string
      const searchText = Object.entries(row)
        .filter(([, v]) => Boolean(v))
        .flatMap(([k, v]) => [k.toLowerCase().replace(/_/g, " "), String(v).toLowerCase()])
        .join(" ");

      const docRef = db.collection(COLLECTION).doc();
      batch.set(docRef, {
        ...row,
        searchText,
        rowIndex,
      });
    }

    await batch.commit();
    uploaded += chunk.length;

    if (uploaded % 50 === 0 || uploaded === rows.length) {
      console.log(`✅  Uploaded ${uploaded} / ${rows.length} rows`);
    }
  }

  console.log(`\n🎉  Done! ${uploaded} documents written to Firestore collection "${COLLECTION}".`);
}

uploadRows(rows).catch((err) => {
  console.error("❌  Upload failed:", err);
  process.exit(1);
});
