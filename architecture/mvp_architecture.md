# mvp_architecture.md

# Lensa Adem — MVP Architecture Document

Version: 1.0  
Status: Draft MVP Architecture  
Owner: Founding Engineering Team  
Document Type: MVP System Architecture  
Related Document: `/docs/prd.md`

---

# 1. Architecture Overview

## Purpose

This document defines the MVP-level system architecture for Lensa Adem, an AI-native environmental regulation intelligence platform focused on Indonesian environmental regulations.

The architecture is optimized for:
- rapid MVP execution,
- retrieval quality,
- citation reliability,
- low operational complexity,
- and AI-assisted engineering workflows.

---

## Architecture Philosophy

The architecture prioritizes:

1. Reliable retrieval quality
2. Citation-grounded AI responses
3. Fast research workflows
4. Operational simplicity
5. Modular future scalability

The system intentionally avoids:
- premature microservices,
- Kubernetes,
- distributed orchestration,
- enterprise infrastructure complexity,
- and overengineered AI pipelines.

---

## Core Architectural Principle

The most important property of the system is:

> Reliable retrieval and citation grounding.

Not:
- UI sophistication,
- model complexity,
- or enterprise scalability.

---

# 2. MVP System Goals

## Primary Technical Goals

| Goal | Description |
|---|---|
| Semantic Retrieval | Retrieve regulation content contextually |
| Citation Grounding | Generate traceable source-backed answers |
| Fast Query Experience | Deliver responses within acceptable latency |
| PWA Accessibility | Cross-device access without native apps |
| Low Operational Complexity | Maintainable by small engineering team |
| Rapid Iteration | Enable fast feature experimentation |

---

## MVP Success Criteria

The MVP architecture is successful if:
- users can query regulations conversationally,
- retrieval quality is consistently useful,
- citations are reliable,
- and the system remains simple to operate.

---

# 3. High-Level System Architecture

## Architectural Style

The MVP uses a:

> Hybrid Serverless + Lightweight Stateful Retrieval Architecture

This combines:
- serverless application services,
- centralized document storage,
- and lightweight vector retrieval infrastructure.

---

## High-Level Architecture Diagram

```text
Users
  ↓
PWA Frontend (Next.js)
  ↓
Firebase Hosting
  ↓
Firebase Functions (API Layer)
  ↓
├── Gemini API
├── Firestore
├── Google Drive API
└── Chroma Vector Database
```

---

## System Layers

| Layer | Responsibility |
|---|---|
| Presentation Layer | PWA user experience |
| Application Layer | API orchestration |
| Retrieval Layer | Semantic search & ranking |
| AI Layer | RAG response generation |
| Data Layer | Metadata & session persistence |
| Storage Layer | Regulation PDF repository |

---

# 4. Core Architectural Principles

## Principle 1 — Retrieval Quality First

System design prioritizes:
- chunk quality,
- semantic retrieval,
- and citation traceability.

---

## Principle 2 — Simplicity Over Scale

The MVP should:
- remain operationally lightweight,
- avoid infrastructure complexity,
- and optimize for development velocity.

---

## Principle 3 — Modular Components

Major system domains should remain loosely coupled:
- ingestion,
- retrieval,
- orchestration,
- frontend,
- and storage.

---

## Principle 4 — AI as Orchestration Layer

LLMs should:
- synthesize retrieved context,
- explain regulations,
- and generate grounded responses.

LLMs should NOT:
- serve as knowledge storage,
- replace retrieval,
- or hallucinate unsupported information.

---

# 5. End-to-End User Request Flow

## User Query Lifecycle

```text
1. User submits question
2. Frontend sends query to backend API
3. Backend generates query embedding
4. Vector search retrieves relevant chunks
5. Retrieved chunks assembled into RAG context
6. Gemini generates grounded response
7. Citation references attached
8. Response returned to frontend
9. Frontend renders answer + citations
```

---

# 6. Regulation Repository Architecture

## Repository Model

Lensa Adem maintains a centralized internal regulation repository.

Users do not upload documents.

---

## Repository Responsibilities

The repository layer is responsible for:
- regulation document storage,
- metadata organization,
- ingestion coordination,
- and document consistency.

---

## Repository Structure

Documents should be organized by:
- regulation type,
- ministry source,
- publication year,
- environmental domain,
- and regulation hierarchy.

---

## Initial Repository Scope

The MVP repository prioritizes:
- environmental laws,
- AMDAL regulations,
- hazardous waste regulations,
- wastewater standards,
- emission standards,
- and environmental permitting regulations.

---

# 7. Google Drive Integration Strategy

## Purpose

Google Drive serves as the MVP document storage layer.

---

## Responsibilities

Google Drive is used for:
- centralized PDF storage,
- document organization,
- ingestion source management,
- and lightweight operational maintenance.

---

## Integration Principles

The integration layer should:
- support structured folder organization,
- preserve file metadata,
- support future synchronization,
- and minimize ingestion complexity.

---

## Why Google Drive

Google Drive is selected because:
- it aligns with Google ecosystem strategy,
- supports rapid MVP iteration,
- reduces infrastructure setup,
- and minimizes storage management overhead.

---

# 8. PDF Ingestion Lifecycle

## Ingestion Flow

```text
Google Drive PDF
  ↓
Document Discovery
  ↓
PDF Download
  ↓
Text Extraction
  ↓
Cleaning & Normalization
  ↓
Chunking
  ↓
Embedding Generation
  ↓
Vector Indexing
  ↓
Metadata Storage
```

---

## Ingestion Objectives

The ingestion pipeline should:
- preserve legal context,
- maintain document traceability,
- support reliable chunk references,
- and optimize retrieval quality.

---

## MVP Ingestion Philosophy

The MVP ingestion workflow prioritizes:
- correctness,
- traceability,
- and simplicity over automation sophistication.

---

# 9. Text Extraction Flow

## Responsibilities

The extraction layer converts PDF documents into structured text suitable for semantic retrieval.

---

## Extraction Objectives

The system should:
- preserve legal clauses,
- maintain article structures,
- retain section hierarchy,
- and minimize OCR corruption.

---

## Extraction Challenges

Potential issues:
- scanned PDFs,
- inconsistent formatting,
- tables,
- multi-column layouts,
- and poor OCR quality.

---

# 10. Chunking & Embedding Workflow

## Chunking Philosophy

Chunk quality is one of the most important system components.

The system should prioritize:
- semantic coherence,
- legal clause preservation,
- and citation traceability.

---

## Chunking Strategy

Chunks should:
- preserve regulation meaning,
- maintain article references,
- avoid context fragmentation,
- and support accurate citations.

---

## Embedding Workflow

```text
Extracted Text
  ↓
Semantic Chunking
  ↓
Metadata Attachment
  ↓
Gemini Embedding Generation
  ↓
Vector Storage in Chroma
```

---

## Chunk Metadata

Each chunk should maintain:
- document reference,
- regulation title,
- article number,
- page reference,
- and chunk identifier.

---

# 11. Vector Retrieval Workflow

## Retrieval Flow

```text
User Query
  ↓
Query Embedding
  ↓
Vector Similarity Search
  ↓
Candidate Chunk Retrieval
  ↓
Context Assembly
  ↓
RAG Prompt Construction
```

---

## Retrieval Objectives

The retrieval layer should:
- maximize relevance,
- minimize hallucination risk,
- and support explainable citations.

---

## Retrieval Priorities

Priority order:
1. relevance,
2. citation traceability,
3. semantic coherence,
4. response speed.

---

# 12. RAG Orchestration Flow

## RAG Responsibilities

The orchestration layer:
- assembles retrieved context,
- constructs prompts,
- invokes Gemini,
- and formats grounded responses.

---

## RAG Philosophy

The LLM should:
- explain retrieved content,
- summarize regulations,
- and synthesize context responsibly.

The LLM should not:
- invent unsupported regulations,
- fabricate citations,
- or answer beyond retrieved evidence.

---

## RAG Flow

```text
Retrieved Chunks
  ↓
Prompt Assembly
  ↓
Gemini Generation
  ↓
Citation Formatting
  ↓
Structured Response
```

---

# 13. Citation Generation Strategy

## Citation Principles

Every significant answer should:
- include traceable sources,
- identify regulation references,
- and support user verification.

---

## Citation Components

Citations should reference:
- regulation title,
- article/section number,
- page number,
- and source document.

---

## Citation Objectives

The citation system exists to:
- increase trust,
- reduce hallucination risk,
- and improve research usability.

---

# 14. PWA Architecture Strategy

## PWA Objectives

The platform is delivered as a Progressive Web App (PWA).

The PWA strategy prioritizes:
- cross-device accessibility,
- installability,
- lightweight performance,
- and mobile usability.

---

## PWA Capabilities

The MVP PWA should support:
- responsive layouts,
- installable experience,
- caching strategies,
- and mobile-friendly navigation.

---

## Platform Scope

The MVP intentionally avoids:
- native iOS apps,
- native Android apps,
- and cross-platform native frameworks.

---

# 15. Frontend Architecture Boundaries

## Frontend Responsibilities

The frontend is responsible for:
- user interaction,
- chat rendering,
- session state,
- citation display,
- and responsive experience.

---

## Frontend Philosophy

The frontend should remain:
- lightweight,
- retrieval-focused,
- and operationally simple.

---

## Frontend Scope

The frontend should avoid:
- complex business logic,
- retrieval orchestration,
- and AI processing responsibilities.

---

# 16. Backend Architecture Boundaries

## Backend Responsibilities

The backend orchestrates:
- retrieval pipelines,
- AI requests,
- session persistence,
- and document coordination.

---

## Backend Philosophy

The backend should:
- remain modular,
- avoid unnecessary abstraction,
- and prioritize maintainability.

---

# 17. AI Service Boundaries

## AI Responsibilities

Gemini services are responsible for:
- embedding generation,
- grounded response generation,
- summarization,
- and conversational explanation.

---

## AI Constraints

The AI layer should:
- operate only on retrieved context,
- avoid unsupported claims,
- and prioritize grounded responses.

---

# 18. Data Flow Lifecycle

## Core Data Flow

```text
PDF Repository
  ↓
Ingestion Pipeline
  ↓
Chunk Store
  ↓
Embedding Generation
  ↓
Vector Database
  ↓
Retrieval Layer
  ↓
RAG Orchestration
  ↓
User Response
```

---

# 19. Session Memory Strategy

## MVP Memory Scope

The MVP supports:
- short-term conversational continuity,
- session-aware context,
- and temporary query history.

---

## Memory Constraints

The MVP intentionally avoids:
- long-term memory systems,
- persistent personalization,
- and agentic memory architectures.

---

# 20. Error Handling Philosophy

## Error Handling Principles

The system should:
- fail gracefully,
- avoid silent hallucinations,
- and provide transparent fallback messaging.

---

## Error Categories

Key error domains:
- retrieval failures,
- AI generation failures,
- ingestion issues,
- OCR corruption,
- and unavailable citations.

---

# 21. Scalability Considerations

## MVP Scalability Philosophy

The MVP prioritizes:
- development velocity,
- retrieval quality,
- and maintainability over enterprise scalability.

---

## Future Scalability Paths

Potential future evolution:
- managed vector infrastructure,
- distributed ingestion,
- asynchronous pipelines,
- and regulation monitoring services.

---

# 22. MVP Technical Constraints

| Constraint | Description |
|---|---|
| Free-Tier First | Optimize for minimal operational cost |
| Google Ecosystem Priority | Prefer Google-native services |
| PWA-First Strategy | Single cross-device application |
| Small-Team Friendly | Maintainable by lean engineering team |
| Modular Architecture | Future extensibility without overengineering |
| Retrieval-First Design | Retrieval quality prioritized above feature complexity |

---

# 23. Security Considerations

## MVP Security Scope

The MVP should:
- secure API access,
- protect session data,
- and restrict internal ingestion access.

---

## Security Priorities

Priority order:
1. API protection,
2. document integrity,
3. access control,
4. logging visibility.

---

# 24. Cost Optimization Strategy

## Cost Philosophy

The MVP architecture prioritizes:
- free-tier compatibility,
- low operational overhead,
- and predictable scaling costs.

---

## Cost Optimization Strategies

Strategies include:
- serverless infrastructure,
- lightweight vector infrastructure,
- controlled ingestion frequency,
- and efficient embedding generation.

---

# 25. Observability & Logging Strategy

## Observability Goals

The system should monitor:
- retrieval quality,
- API failures,
- ingestion status,
- response latency,
- and citation integrity.

---

## Logging Priorities

Critical logging areas:
- failed retrievals,
- hallucination indicators,
- ingestion failures,
- and vector indexing issues.

---

# 26. Future Architecture Expansion

## Potential Future Enhancements

Future versions may include:
- automated regulation synchronization,
- reranking pipelines,
- multilingual support,
- compliance analysis tools,
- and regulation monitoring systems.

---

## Expansion Philosophy

Future evolution should:
- remain modular,
- preserve retrieval reliability,
- and avoid architecture fragmentation.

---

# 27. Explicit Non-Goals

The MVP intentionally excludes:
- multi-agent systems,
- enterprise workflow automation,
- advanced analytics,
- fine-tuned custom models,
- native mobile apps,
- distributed infrastructure,
- and enterprise orchestration layers.

---

# 28. Architecture Risks

| Risk | Impact |
|---|---|
| Poor Chunk Quality | Retrieval degradation |
| OCR Failures | Citation corruption |
| Hallucinated Responses | Trust reduction |
| Incomplete Metadata | Weak citations |
| Embedding Drift | Retrieval inconsistency |
| Overengineering | Reduced development velocity |

---

# 29. Architecture Decision Summary

| Decision Area | MVP Decision |
|---|---|
| Frontend | Next.js PWA |
| Styling | Tailwind CSS |
| Hosting | Firebase Hosting |
| Backend | Firebase Functions |
| AI Model | Gemini 2.5 Flash |
| Embeddings | Gemini Embeddings |
| Vector Database | Chroma |
| Metadata Storage | Firestore |
| Document Storage | Google Drive |
| Architecture Style | Hybrid Serverless + Stateful Retrieval |
| Development Philosophy | Spec-Driven + AI-Assisted Engineering |

---

# Final Architecture Statement

Lensa Adem’s MVP architecture is intentionally designed to maximize:
- retrieval reliability,
- citation grounding,
- rapid iteration,
- and operational simplicity.

The architecture prioritizes:
- trustworthy regulation intelligence,
- modular evolution,
- and sustainable MVP execution.

The system intentionally sacrifices:
- enterprise complexity,
- premature scalability,
- and infrastructure sophistication

in favor of:
- focused product validation,
- retrieval quality,
- and engineering velocity.