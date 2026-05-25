// Takes retrieved chunks and a user query,
// builds a grounded prompt, sends to Gemini,
// and returns a structured answer with citations.
// ─────────────────────────────────────────────────────────

import { genAI } from "../embedding/client";
import { SearchResult } from "../vector/search";

const MODEL = "gemini-2.5-flash";

// ─── Citation shape ───────────────────────────────────────
export interface Citation {
  index: number;
  fileName: string;
  regulationType: string;
  article?: string;
  section?: string;
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
  const year   = match[2];

  const prefixMap: Record<string, string> = {
    uu:      `UU No. ${number} Tahun ${year}`,
    pp:      `PP No. ${number} Tahun ${year}`,
    permen:  `Permen LH No. ${number} Tahun ${year}`,
    perpres: `Perpres No. ${number} Tahun ${year}`,
    perda:   `Perda No. ${number} Tahun ${year}`,
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
        chunk.metadata.article,
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
    article: chunk.metadata.article,
    section: chunk.metadata.section,
    chunkIndex: chunk.metadata.chunkIndex,
    preview: chunk.content.slice(0, 200),
  }));
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

  // Threshold filtered everything — return clean rejection
  // without calling the LLM at all (saves latency + cost).
  if (chunks.length === 0) {
    return {
      answer:
        "Topik ini belum tercakup dalam basis data regulasi yang tersedia saat ini. " +
        "Coba pertanyaan lain seputar pengelolaan sampah, EPR, atau izin lingkungan hidup.",
      citations: [],
      totalChunksUsed: 0,
      model: MODEL,
    };
  }

  const context   = buildContext(chunks);
  const citations = buildCitations(chunks);

  // ── User prompt ──────────────────────────────────────
  // "Kutipan regulasi" framing — not "konteks yang diberikan" —
  // prevents the model from attributing the source to the user.
  const userPrompt = `Pertanyaan: ${query}

Kutipan regulasi dari basis data internal (gunakan HANYA ini sebagai sumber jawaban):
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

  return {
    answer,
    citations,
    totalChunksUsed: chunks.length,
    model: MODEL,
  };
}