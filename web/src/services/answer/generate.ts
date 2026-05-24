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

// ─── Build context string from chunks ────────────────────
// Each chunk gets a numbered reference [1], [2], etc.
// so Gemini can cite them in its answer.
function buildContext(
  chunks: SearchResult[]
): string {

  return chunks
    .map((chunk, index) => {

      const ref = index + 1;

      const source = [
        chunk.metadata.fileName,
        chunk.metadata.article,
      ]
        .filter(Boolean)
        .join(" — ");

      return `[${ref}] ${source}\n${chunk.content}`;
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
// Instructs Gemini to answer strictly from
// provided context and cite sources by number.
const SYSTEM_PROMPT = `Anda adalah konsultan hukum lingkungan hidup Indonesia yang berpengalaman. 
Jawab pertanyaan pengguna secara langsung, lugas, dan profesional — 
seperti seorang ahli yang berbicara kepada klien, bukan seperti sistem 
yang melaporkan hasil pencarian.

Panduan gaya penulisan:
- Mulai langsung dengan substansi jawaban, bukan dengan kalimat pembuka seperti 
  "Berdasarkan regulasi..." atau "Dalam konteks yang diberikan..."
- Gunakan paragraf mengalir. Hindari bullet point kecuali untuk penjelasan terkait daftar tertentu 
  atau prosedur yang memang berurutan.
- Jika informasi tidak tersedia dalam dokumen, sampaikan dengan singkat di akhir 
  jawaban — bukan di awal sebagai disclaimer.
- Gunakan kalimat aktif. Hindari konstruksi pasif yang berlebihan.
- Nomor sitasi [1], [2] cukup disisipkan secara alami di akhir kalimat yang relevan, 
  bukan dikelompokkan.
- Jangan menyebutkan "konteks regulasi", "chunk", atau istilah teknis sistem.

Contoh gaya yang salah:
"Berdasarkan konteks regulasi yang dimuat, tidak ada penjelasan eksplisit 
mengenai alasan mengapa produsen diwajibkan..."

Contoh gaya yang benar:
"Kewajiban EPR bagi produsen bertujuan memindahkan tanggung jawab 
pengelolaan sampah dari pemerintah kepada pihak yang menghasilkan produk. 
Meski dasar filosofis ini tidak dinyatakan eksplisit dalam Permen LH 75/2019, 
kewajiban teknisnya diatur secara rinci: produsen wajib mendaur ulang, 
menyediakan fasilitas penampungan, dan melakukan penarikan sampah [2]."`;

// ─── Main answer generator ────────────────────────────────
export async function generateAnswer(
  query: string,
  chunks: SearchResult[]
): Promise<GeneratedAnswer> {

  if (chunks.length === 0) {
    return {
      answer:
        "Maaf, tidak ditemukan informasi yang relevan dalam database regulasi untuk menjawab pertanyaan Anda.",
      citations: [],
      totalChunksUsed: 0,
      model: MODEL,
    };
  }

  const context = buildContext(chunks);
  const citations = buildCitations(chunks);

  const userPrompt = `Pertanyaan: ${query}
 
Konteks Regulasi:
${context}
 
Berikan jawaban berdasarkan konteks di atas.`;

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
    throw new Error(
      "Gemini returned empty answer"
    );
  }

  return {
    answer,
    citations,
    totalChunksUsed: chunks.length,
    model: MODEL,
  };
}