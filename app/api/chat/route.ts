import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getGeminiModel } from "@/lib/gemini";

const STOP_WORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "i","me","my","we","our","you","your","he","him","his","she","her","it","its",
  "they","them","their","what","which","who","this","that","these","those",
  "when","where","why","how","all","both","each","few","more","most","other",
  "some","such","no","not","only","same","so","than","too","very","just",
  "but","and","or","nor","for","yet","at","by","in","of","on","to","up","as",
  "into","through","about","above","after","before","between","during","out","over",
  "then","there","here","tell","give","find","show","list","please","get","make",
  "want","need","know","said","say","data","dataset",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

interface DatasetResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  fieldNames: string[];
}

async function searchDataset(query: string, limit = 200, topK = 15): Promise<DatasetResult> {
  const db = getAdminDb();
  const keywords = tokenize(query);

  const [snap, countSnap] = await Promise.all([
    db.collection("dataset").limit(limit).get(),
    db.collection("dataset").count().get(),
  ]);
  const totalCount = countSnap.data().count;
  if (snap.empty) return { rows: [], totalCount, fieldNames: [] };

  const META = new Set(["searchText","rowIndex","id"]);
  const firstDoc = snap.docs[0].data();
  const fieldNames = Object.keys(firstDoc).filter((k) => !META.has(k));
  const fieldNamesLower = fieldNames.map((f) => f.toLowerCase().replace(/_/g," "));

  if (!keywords.length) {
    return { rows: snap.docs.slice(0, topK).map((d) => ({ id: d.id, ...d.data() })), totalCount, fieldNames };
  }

  const matchedFields = keywords.filter((kw) => fieldNamesLower.some((f) => f.includes(kw) || kw.includes(f)));

  const scored = snap.docs.map((doc) => {
    const data = { id: doc.id, ...doc.data() } as Record<string, unknown>;
    const searchText = ((data.searchText as string) ?? "").toLowerCase();
    const valueScore = keywords.reduce((acc, kw) => acc + (searchText.includes(kw) ? 1 : 0), 0);
    const fieldScore = matchedFields.length > 0 ? 1 : 0;
    return { score: valueScore + fieldScore, data };
  });

  const matches = scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, topK).map((r) => r.data);
  const rows = matches.length > 0 ? matches : snap.docs.slice(0, topK).map((d) => ({ id: d.id, ...d.data() }));
  return { rows, totalCount, fieldNames };
}

function formatRows(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "No records.";
  return rows.map((row, i) => {
    const fields = Object.entries(row)
      .filter(([k]) => k !== "searchText" && k !== "id")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    return `Record ${i + 1}: { ${fields} }`;
  }).join("\n");
}

async function getAnalyticsContext(): Promise<string> {
  try {
    const db = getAdminDb();
    const doc = await db.collection("analytics_cache").doc("latest").get();
    if (!doc.exists) return "";
    const d = doc.data()!;
    const kpis = d.kpis ?? {};
    const topSites = (d.siteStats ?? []).slice(0, 5).map((s: Record<string,unknown>) => `${s.site} (bleaching: ${s.avgBleaching}%)`).join(", ");
    const dmg = (d.damageDistribution ?? []).map((x: Record<string,unknown>) => `${x.state}: ${x.percent}%`).join(", ");
    const enso = (d.ensoStats ?? []).map((x: Record<string,unknown>) => `${x.phase}: avg bleaching ${x.avgBleaching}%`).join(", ");
    return `
DATASET ANALYTICS SUMMARY (pre-computed from ${d.totalCount} records, ${d.dateRange?.min}-${d.dateRange?.max}):
- Total sites monitored: ${d.uniqueSites?.length} (${d.uniqueSites?.slice(0,5).join(", ")}, ...)
- Average bleaching: ${kpis.avgBleaching}% | Average temperature: ${kpis.avgTemperature}°C | Average DHW stress: ${kpis.avgDHW}
- Healthy reef percent: ${kpis.healthyPercent}% | Most affected site: ${kpis.mostAffectedSite}
- Damage state breakdown: ${dmg}
- ENSO phase impact: ${enso}
- Top 5 most bleached sites: ${topSites}
- Analytics computed at: ${d.computedAt}
`.trim();
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { message: string; history: Array<{ role: string; content: string }> };
    const { message, history = [] } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const [{ rows: relevantRows, totalCount, fieldNames }, analyticsContext] = await Promise.all([
      searchDataset(message),
      getAnalyticsContext(),
    ]);

    const dataContext = formatRows(relevantRows);
    const historyText = history.length > 0
      ? "\n\nCONVERSATION HISTORY:\n" + history.map((h) => `${h.role === "user" ? "User" : "CORAL"}: ${h.content}`).join("\n")
      : "";

    const fullPrompt = `You are CORAL, a coastal intelligence assistant for the Sri Lanka Coastal Management Department.
You analyze coral reef health, bleaching events, ocean temperature anomalies, and water quality data from ${totalCount} monitoring records across ${fieldNames.length > 0 ? "sites including " + fieldNames.slice(0,3).join(", ") : "multiple sites"} in Sri Lanka.
Dataset columns: ${fieldNames.join(", ")}.

${analyticsContext ? analyticsContext + "\n" : ""}
RELEVANT DATA RECORDS (sample most relevant to the question):
${dataContext}${historyText}

User question: ${message}

Provide a concise, data-driven answer. Use specific numbers from the records above. Focus on actionable insights for coastal management.
Answer:`;

    const model = getGeminiModel();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await model.generateContentStream(fullPrompt);
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (streamErr: unknown) {
          let msg = "Sorry, I encountered an error. Please try again.";
          if (streamErr && typeof streamErr === "object") {
            const raw = String((streamErr as Record<string,unknown>).message ?? "");
            if (raw.includes("API_KEY_INVALID")) msg = "⚠️ Gemini API key invalid. Update GEMINI_API_KEY in .env.local";
            else if (raw.includes("quota") || raw.includes("429")) msg = "⚠️ API quota exceeded. Please wait a moment and try again.";
            else if (raw.length > 0) msg = `⚠️ Error: ${raw}`;
          }
          controller.enqueue(encoder.encode(msg));
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" } });
  } catch (err: unknown) {
    console.error("/api/chat error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
