// Takes retrieved chunks and a user query,
// builds a grounded prompt, sends to Gemini,
// and returns a structured answer with citations.
// ─────────────────────────────────────────────────────────

import { genAI } from "../embedding/client";
import { SearchResult } from "../vector/search";

const MODEL = "gemini-2.5-flash";

// ─── Corpus manifest ──────────────────────────────────────
// Human-readable list of what's actually in the vector store.
// Update this whenever you add new regulation documents.
const AVAILABLE_REGULATIONS = [
  "Permen LH No. 75 Tahun 2019 — Peta Jalan Pengurangan Sampah oleh Produsen (EPR)",
  "UU No. 18 Tahun 2008 — Pengelolaan Sampah",
];

// ─── Citation shape ───────────────────────────────────────
export interface Citation {
  index: number;
  fileName: string;
  regulationType: string;
  bab?: string;
  pasal?: string;
  ayat?: string;
  chunkIndex: number;
  preview: string;
}

// ─── Answer shape ─────────────────────────────────────────
export interface GeneratedAnswer {
  answer: string;
  citations: Citation[];
  totalChunksUsed: number;
  model: string;
}

// ─── Query type classifier ────────────────────────────────
// Detects conversational and meta queries that should bypass
// the vector store entirely and get a direct LLM response.
//
// Returns "conversational" | "regulation"
async function classifyQuery(
  query: string
): Promise<"conversational" | "regulation"> {

  const prompt = `Klasifikasikan pertanyaan berikut ke dalam salah satu kategori:
 
"conversational" — pertanyaan umum, sapaan, pertanyaan tentang sistem ini,
permintaan daftar regulasi, atau pertanyaan yang tidak membutuhkan pencarian
dokumen regulasi spesifik. Contoh: "apa yang bisa kamu bantu?",
"regulasi apa saja yang tersedia?", "kok bisa tidak ketemu?", "terima kasih".
 
"regulation" — pertanyaan yang membutuhkan pencarian dan kutipan dari dokumen
regulasi lingkungan hidup Indonesia. Contoh: "apa sanksi pelanggaran AMDAL?",
"siapa yang wajib menyusun UKL-UPL?", "kewajiban produsen dalam EPR".
 
Pertanyaan: "${query}"
 
Jawab hanya dengan satu kata: conversational ATAU regulation`;

  const response = await genAI.models.generateContent({
    model: MODEL,
    config: { temperature: 0 },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const result =
    response.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim()
      .toLowerCase() ?? "";

  return result.includes("conversational")
    ? "conversational"
    : "regulation";
}

// ─── Conversational response generator ───────────────────
// Handles meta and conversational queries without
// touching the vector store.
async function generateConversationalAnswer(
  query: string
): Promise<GeneratedAnswer> {

  const regulationList = AVAILABLE_REGULATIONS
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");

  const prompt = `Anda adalah asisten konsultasi regulasi lingkungan hidup Indonesia
bernama Lensa Adem. Basis data regulasi yang tersedia saat ini:
 
${regulationList}
 
Pertanyaan pengguna: "${query}"
 
Panduan:
- Jawab secara alami, singkat, dan ramah — seperti asisten yang membantu.
- Jika ditanya regulasi apa yang tersedia, sebutkan daftar di atas.
- Jika ditanya kenapa pertanyaan tidak terjawab, jelaskan bahwa topik tersebut
  mungkin belum ada dalam basis data atau perlu penambahan dokumen regulasi baru.
- Jangan gunakan bullet point berlebihan. Jawab dalam 2-3 kalimat maksimal
  kecuali memang perlu lebih panjang.
- Jangan sebut nama model AI atau teknologi internal.`;

  const response = await genAI.models.generateContent({
    model: MODEL,
    config: { temperature: 0.3 },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const answer =
    response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return {
    answer: answer || "Ada yang bisa saya bantu terkait regulasi lingkungan hidup?",
    citations: [],
    totalChunksUsed: 0,
    model: MODEL,
  };
}

// ─── Regulation name formatter ────────────────────────────
// Converts a raw fileName into a human-readable
// regulation name the model can cite naturally.
// e.g. "permenLH_75_2019_epr.json" → "Permen LH No. 75 Tahun 2019"
function formatRegulationName(
  fileName: string,
  regulationType: string
): string {

  const base = fileName
    .replace(/\.json$/, "")
    .replace(/\.pdf$/, "");

  // Try to extract number + year pattern (e.g. _75_2019_)
  const match = base.match(/_(\d+)_(\d{4})/);

  if (!match) return base.replace(/_/g, " ");

  const number = match[1];
  const year = match[2];

  const prefixMap: Record<string, string> = {
    uu: `UU No. ${number} Tahun ${year}`,
    pp: `PP No. ${number} Tahun ${year}`,
    permen: `Permen LH No. ${number} Tahun ${year}`,
    perpres: `Perpres No. ${number} Tahun ${year}`,
    perda: `Perda No. ${number} Tahun ${year}`,
  };

  return prefixMap[regulationType.toLowerCase()]
    ?? `Regulasi No. ${number} Tahun ${year}`;
}

// ─── Build context string from chunks ────────────────────
// Each chunk gets a numbered reference [1], [2], etc.
// Label includes the human-readable regulation name
// so Gemini can cite it correctly in prose.
function buildContext(
  chunks: SearchResult[]
): string {

  return chunks
    .map((chunk, index) => {

      const ref = index + 1;

      const regulationName = formatRegulationName(
        chunk.metadata.fileName,
        chunk.metadata.regulationType
      );

      const source = [
        regulationName,
        chunk.metadata.bab,
        chunk.metadata.pasal,
        chunk.metadata.ayat,
      ]
        .filter(Boolean)
        .join(", ");

      return `[${ref}] Sumber: ${source}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

// ─── Build citations array ────────────────────────────────
function buildCitations(
  chunks: SearchResult[]
): Citation[] {

  return chunks.map((chunk, index) => ({
    index: index + 1,
    fileName: chunk.metadata.fileName,
    regulationType: chunk.metadata.regulationType,
    bab: chunk.metadata.bab,
    pasal: chunk.metadata.pasal,
    ayat: chunk.metadata.ayat,
    chunkIndex: chunk.metadata.chunkIndex,
    preview: chunk.content.slice(0, 200),
  }));
}

// ─── Filter citations to only those used in the answer ───
// The model receives chunks [1]...[n] but may only cite
// a subset. This removes unused citations and re-indexes
// the survivors so numbers stay consecutive in the UI.
//
// It also rewrites the answer text so e.g. [3] becomes [2]
// if chunk 2 was dropped — keeping answer and citation list
// perfectly in sync.
function filterCitationsByUsage(
  answer: string,
  citations: Citation[]
): { answer: string; citations: Citation[] } {

  // 1. Collect every [n] that appears in the answer text
  const usedIndices = new Set(
    [...answer.matchAll(/\[(\d+)\]/g)]
      .map((m) => parseInt(m[1], 10))
  );

  // 2. Keep only citations the model actually referenced,
  //    preserving original order
  const used = citations.filter(
    (c) => usedIndices.has(c.index)
  );

  // 3. Build a remapping: old index → new consecutive index
  //    e.g. if [1, 3, 5] were cited → they become [1, 2, 3]
  const remap = new Map<number, number>();
  used.forEach((c, i) => {
    remap.set(c.index, i + 1);
  });

  // 4. Rewrite [n] references in the answer text
  const rewrittenAnswer = answer.replace(
    /\[(\d+)\]/g,
    (match, num) => {
      const newIndex = remap.get(parseInt(num, 10));
      return newIndex !== undefined
        ? `[${newIndex}]`
        : match;
    }
  );

  // 5. Update index field on each kept citation
  const reindexed = used.map((c, i) => ({
    ...c,
    index: i + 1,
  }));

  return {
    answer: rewrittenAnswer,
    citations: reindexed,
  };
}

// ─── System prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `Anda adalah konsultan hukum lingkungan hidup Indonesia yang berpengalaman.
Jawab pertanyaan pengguna secara langsung, lugas, dan profesional —
seperti seorang ahli yang berbicara kepada klien, bukan seperti sistem yang melaporkan hasil pencarian.

ATURAN WAJIB — sumber regulasi:
Kutipan regulasi di bawah diambil secara otomatis dari basis data internal.
Pengguna TIDAK menyediakan dokumen ini.
Jangan pernah menyebut "regulasi yang Anda berikan", "dokumen yang Anda sediakan",
atau "berdasarkan konteks yang diberikan".
Sebut regulasi langsung dengan namanya: "menurut Permen LH No. 75 Tahun 2019",
"UU No. 18 Tahun 2008 mewajibkan...", dan seterusnya.

ATURAN WAJIB — batas pengetahuan:
Jawab HANYA berdasarkan kutipan regulasi yang disediakan.
Jangan mengarang, menyimpulkan, atau mengisi kekosongan dari pengetahuan umum.
Jika kutipan tidak memuat informasi yang cukup untuk menjawab pertanyaan,
nyatakan dalam SATU kalimat di awal: "Topik ini belum tercakup dalam basis data
regulasi yang tersedia saat ini." — lalu sebutkan apa yang MEMANG ada dalam
kutipan yang masih relevan, jika ada.

Panduan gaya penulisan:
- Mulai langsung dengan substansi jawaban. Jangan awali dengan kalimat basa-basi
  seperti "Tentu saja" atau "Pertanyaan yang bagus".
- Gunakan paragraf mengalir. Hindari bullet point kecuali untuk menjelaskan tentang daftar tertentu
  atau prosedur yang memang berurutan secara logis.
- Sisipkan nomor sitasi [1], [2] secara alami di akhir kalimat yang relevan —
  bukan dikelompokkan di akhir paragraf.
- Hindari frasa: "konteks regulasi", "berdasarkan konteks", "chunk", "dokumen
  yang diberikan", "regulasi yang Anda berikan".
- Gunakan kalimat aktif. Hindari konstruksi pasif yang berlebihan.

Contoh yang SALAH:
"Berdasarkan konteks regulasi yang dimuat, tidak ada penjelasan eksplisit..."
"Regulasi yang Anda berikan, yaitu Permen LH 75/2019, menjelaskan..."

Contoh yang BENAR:
"Permen LH No. 75 Tahun 2019 mewajibkan produsen untuk mendaur ulang
dan menyediakan fasilitas penampungan sampah dari produk mereka [2].
Kewajiban ini bertujuan memindahkan tanggung jawab pengelolaan sampah
dari pemerintah kepada pihak yang menghasilkan produk."`;

// ─── Main answer generator ────────────────────────────────
export async function generateAnswer(
  query: string,
  chunks: SearchResult[]
): Promise<GeneratedAnswer> {

  // ── Step 1: Classify the query ───────────────────────
  // Conversational and meta queries bypass vector search
  // entirely and get a direct, natural LLM response.
  const queryType = await classifyQuery(query);

  if (queryType === "conversational") {
    return generateConversationalAnswer(query);
  }

  // ── Step 2: No relevant chunks found ────────────────
  // Threshold filtered everything — skip LLM call,
  // return a natural explanation with corpus scope hint.
  if (chunks.length === 0) {
    const regulationList = AVAILABLE_REGULATIONS
      .map((r) => `• ${r}`)
      .join("\n");

    return {
      answer:
        `Topik ini belum tercakup dalam basis data regulasi yang tersedia saat ini.\n\n` +
        `Regulasi yang tersedia:\n${regulationList}\n\n` +
        `Coba ajukan pertanyaan seputar pengelolaan sampah, kewajiban produsen, atau izin lingkungan.`,
      citations: [],
      totalChunksUsed: 0,
      model: MODEL,
    };
  }

  // ── Step 3: Generate grounded answer from chunks ─────
  const context = buildContext(chunks);
  const citations = buildCitations(chunks);

  // ── User prompt ──────────────────────────────────────
  // "Kutipan regulasi" framing — not "konteks yang diberikan" —
  // prevents the model from attributing the source to the user.
  const userPrompt = `Pertanyaan: ${query}

Kutipan regulasi dari basis data internal (HANYA gunakan ini sebagai sumber jawaban):
${context}

Jawab pertanyaan di atas. Jika kutipan tidak cukup, katakan demikian secara eksplisit.`;

  const response =
    await genAI.models.generateContent({
      model: MODEL,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
    });

  const answer =
    response.candidates?.[0]?.content
      ?.parts?.[0]?.text ?? "";

  if (!answer) {
    throw new Error("Gemini returned empty answer");
  }

  // ── Step 4: Drop citations the model didn't use ──────
  // Filter to only citations the model actually used
  // Drops irrelevant chunks from the sidebar and re-indexes
  // so citation numbers in the answer text stay in sync.
  const { answer: finalAnswer, citations: finalCitations } =
    filterCitationsByUsage(answer, citations);

  return {
    answer: finalAnswer,
    citations: finalCitations,
    totalChunksUsed: chunks.length,
    model: MODEL,
  };
}