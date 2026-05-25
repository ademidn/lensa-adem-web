"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

// ─── Types ────────────────────────────────────────────────

interface Citation {
  index: number;
  fileName: string;
  regulationType: string;
  bab?: string;
  pasal?: string;
  ayat?: string;
  chunkIndex: number;
  preview: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timing?: {
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
  isLoading?: boolean;
}

// ─── Constants ────────────────────────────────────────────

const SUGGESTIONS = [
  "Apa itu AMDAL dan siapa yang wajib menyusunnya?",
  "Jelaskan tentang EPR di Indonesia?",
  "Jelaskan mengenai kewajiban produsen dalam pengelolaan sampah",
  "Bagimana prosedur pengurusan izin lingkungan untuk industri",
];

const REGULATION_TYPES = [
  { value: "", label: "Semua Regulasi" },
  { value: "uu", label: "Undang-Undang" },
  { value: "pp", label: "Peraturan Pemerintah" },
  { value: "permen", label: "Peraturan Menteri" },
  { value: "perpres", label: "Peraturan Presiden" },
  { value: "perda", label: "Peraturan Daerah" },
];

// ─── Helpers ──────────────────────────────────────────────

function formatFileName(name: string): string {
  return name.replace(".pdf", "").replace(/_/g, " ");
}

function formatRegTypeShort(type: string): string {
  const map: Record<string, string> = {
    uu: "UU",
    pp: "PP",
    permen: "PermenLH",
    perpres: "Perpres",
    perda: "Perda",
  };
  return map[type.toLowerCase()] ?? type.toUpperCase();
}

function getTagClass(type: string): string {
  const map: Record<string, string> = {
    uu: "tag-uu",
    pp: "tag-pp",
    permen: "tag-permen",
    perpres: "tag-perpres",
    perda: "tag-perda",
  };
  return map[type.toLowerCase()] ?? "tag-default";
}

// ─── Icons ────────────────────────────────────────────────

const SendIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const LayersIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const FileIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const FilterIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const BookIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ChevronIcon = ({ rotated }: { rotated: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    style={{
      transition: "transform 0.2s ease",
      transform: rotated ? "rotate(180deg)" : "rotate(0deg)",
      flexShrink: 0,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Citation Card ────────────────────────────────────────

function CitationCard({ citation }: { citation: Citation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`citation-card ${expanded ? "citation-expanded" : ""}`}>
      <button
        className="citation-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="citation-num">{citation.index}</span>

        <div className="citation-info">
          <div className="citation-top-row">
            <span className={`reg-tag ${getTagClass(citation.regulationType)}`}>
              {formatRegTypeShort(citation.regulationType)}
            </span>
            {(citation.pasal || citation.bab) && (
              <span className="citation-article">{[citation.bab, citation.pasal, citation.ayat]
              .filter(Boolean)
              .join(" · ")}
              </span>
            )}
          </div>
          <span className="citation-filename">
            {formatFileName(citation.fileName)}
          </span>
        </div>

        <ChevronIcon rotated={expanded} />
      </button>

      {expanded && (
        <div className="citation-body">
          <p className="citation-preview-text">{citation.preview}</p>
        </div>
      )}
    </div>
  );
}

// ─── Thinking Indicator ───────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="thinking-row">
      <div className="thinking-avatar">
        <SearchIcon />
      </div>
      <div className="thinking-content">
        <span className="thinking-label">Menelusuri regulasi</span>
        <div className="thinking-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  if (message.isLoading) {
    return <ThinkingIndicator />;
  }

  if (message.role === "user") {
    return (
      <div className="user-row">
        <div className="user-bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="assistant-row">

      {/* Answer block */}
      <div className="answer-block">
        <div className="answer-header">
          <div className="answer-icon">
            <LayersIcon />
          </div>
          <span className="answer-label">Jawaban</span>
          {message.timing && (
            <span className="timing-badge">
              {(message.timing.totalMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        <div className="answer-text">{message.content}</div>
      </div>

      {/* Sources block */}
      {message.citations && message.citations.length > 0 && (
        <div className="sources-block">
          <div className="sources-header">
            <FileIcon />
            <span>Sumber Regulasi</span>
            <span className="sources-count">{message.citations.length}</span>
          </div>
          <div className="citations-list">
            {message.citations.map((c) => (
              <CitationCard key={c.index} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <BookIcon />
      </div>
      <h1 className="empty-title">Apa yang ingin Anda cari?</h1>
      <p className="empty-subtitle">
        Tanyakan apa saja tentang regulasi pengelolaan lingkungan hidup
        Indonesia. Setiap jawaban disertai sumber regulasi yang dapat
        diverifikasi.
      </p>
      <div className="suggestions-grid">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="suggestion-card"
            onClick={() => onSuggestion(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [regulationType, setRegulationType] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleSubmit = useCallback(
    async (queryOverride?: string) => {
      const query = (queryOverride ?? input).trim();
      if (!query || isLoading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: query,
      };

      const loadingMsg: Message = {
        id: `l-${Date.now()}`,
        role: "assistant",
        content: "",
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const body: Record<string, unknown> = { query, topK: 5 };

        if (regulationType) {
          body.regulationType = regulationType;
        }

        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.success
            ? data.answer
            : `Terjadi kesalahan: ${data.error}`,
          citations: data.citations ?? [],
          timing: data.meta?.timing,
        };

        setMessages((prev) =>
          prev.filter((m) => !m.isLoading).concat(assistantMsg)
        );
      } catch {
        setMessages((prev) =>
          prev.filter((m) => !m.isLoading).concat({
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Terjadi kesalahan koneksi. Silakan coba lagi.",
          })
        );
      } finally {
        setIsLoading(false);
        // Re-focus textarea after response
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    },
    [input, isLoading, regulationType]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="shell">

      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">LA</div>
          <div className="brand-text">
            <div className="brand-name">Lensa Adem</div>
            <div className="brand-tagline">
              Regulasi Lingkungan Hidup Indonesia
            </div>
          </div>
        </div>

        <div className="filter-pill">
          <span className="filter-pill-icon">
            <FilterIcon />
          </span>
          <select
            value={regulationType}
            onChange={(e) => setRegulationType(e.target.value)}
            aria-label="Filter jenis regulasi"
          >
            {REGULATION_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ── Scroll area ── */}
      <div className="scroll-area" ref={scrollAreaRef}>

        {/* Empty state */}
        {isEmpty && <EmptyState onSuggestion={handleSubmit} />}

        {/* Message feed */}
        {messages.length > 0 && (
          <div className="feed">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

      </div>

      {/* ── Input area ── */}
      <div className="input-area">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="input-ta"
            placeholder="Tanyakan tentang regulasi lingkungan hidup..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            aria-label="Input pertanyaan"
          />
          <button
            className="send-btn"
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            aria-label="Kirim pertanyaan"
          >
            <SendIcon />
          </button>
        </div>
        <p className="input-hint">
          Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </div>

    </div>
  );
}