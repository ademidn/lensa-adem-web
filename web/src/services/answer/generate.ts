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
const SYSTEM_PROMPT = `Kamu adalah asisten hukum lingkungan hidup Indonesia bernama Lensa Adem.
Tugasmu adalah menjawab pertanyaan pengguna berdasarkan konteks regulasi yang diberikan.
 
Ikuti aturan berikut dengan ketat:
1. Jawab HANYA berdasarkan konteks regulasi yang diberikan. Jangan menambahkan informasi di luar konteks.
2. Setiap pernyataan yang bersumber dari regulasi harus disertai nomor referensi dalam tanda kurung siku, contoh: [1], [2].
3. Jika konteks tidak cukup untuk menjawab pertanyaan, nyatakan dengan jelas bahwa informasi tidak tersedia dalam regulasi yang dimuat.
4. Gunakan bahasa Indonesia yang formal dan mudah dipahami.
5. Struktur jawaban: ringkasan singkat terlebih dahulu, kemudian penjelasan detail jika diperlukan.`;
 
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