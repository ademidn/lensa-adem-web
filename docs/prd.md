# /docs/prd.md

# Lensa Adem — Product Requirements Document (PRD)

Version: 0.1  
Status: Draft MVP PRD  
Owner: Founding Team  
Document Type: Product Requirements Document  
Development Methodology: Spec-Driven Development + AI-Assisted Engineering

---

# 1. Executive Summary

## Product Overview

Lensa Adem is an AI-powered regulation intelligence platform focused on Indonesian environmental regulations.

The platform enables users to:
- search environmental regulations semantically,
- interact through conversational AI,
- retrieve grounded legal references,
- and receive citation-based answers sourced directly from official regulatory documents.

Unlike traditional keyword-based search systems, Lensa Adem uses Retrieval-Augmented Generation (RAG) to understand user intent and retrieve contextually relevant regulation content from indexed PDF documents.

The initial MVP focuses on:
- environmental regulation discovery,
- semantic legal search,
- citation-grounded answers,
- and rapid research workflows.

---

## Vision Statement

Build the most accessible AI-native environmental regulation intelligence platform in Indonesia.

---

## Product Mission

Reduce the time and complexity required to:
- understand environmental regulations,
- retrieve relevant legal references,
- and perform compliance-related research.

---

# 2. Problem Statement

## Background

Environmental regulations in Indonesia are fragmented across:
- government websites,
- PDF documents,
- ministry portals,
- and legal repositories.

Most users currently rely on:
- manual Google searches,
- PDF keyword search,
- and document-by-document reading.

This creates:
- inefficient workflows,
- poor discoverability,
- interpretation difficulties,
- and high research overhead.

---

## Core Problems

| Problem | Description |
|---|---|
| Fragmented Regulations | Regulations exist across multiple disconnected sources |
| Poor Searchability | Traditional keyword search lacks contextual understanding |
| Complex Legal Language | Regulations are difficult for non-legal users to interpret |
| Time-Consuming Research | Users spend excessive time locating references |
| Cross-Document Dependencies | Regulations reference multiple related documents |
| Regulatory Updates | Users struggle to identify latest applicable rules |

---

## Why Existing Solutions Fail

Existing search systems:
- rely heavily on exact keyword matching,
- do not understand semantic intent,
- lack grounded conversational interfaces,
- and do not provide AI-assisted contextual explanations.

---

# 3. Product Goals

## Primary Goals

### Goal 1 — Accelerate Regulation Discovery

Enable users to retrieve relevant regulations within seconds using natural language.

---

### Goal 2 — Improve Research Efficiency

Reduce time spent searching and interpreting environmental regulations.

---

### Goal 3 — Provide Grounded AI Responses

Ensure answers are:
- source-based,
- citation-grounded,
- and traceable to official documents.

---

### Goal 4 — Enable Conversational Legal Search

Allow users to interact with regulations using human language instead of rigid legal terminology.

---

# 4. Target Users

## Primary User Persona

### Environmental Engineering Students

#### Characteristics
- Conducting academic research
- Learning environmental regulations
- Frequently referencing legal documents

#### Needs
- Faster research workflows
- Simpler legal interpretation
- Reliable citations

#### Pain Points
- Difficulty understanding legal language
- Time-consuming document searches
- Lack of contextual search tools

---

## Secondary User Personas

### Environmental Consultants

Use cases:
- compliance validation,
- client reporting,
- regulation referencing.

---

### ESG and Sustainability Teams

Use cases:
- environmental compliance research,
- operational policy validation,
- sustainability documentation.

---

### Researchers and Analysts

Use cases:
- comparative regulation studies,
- environmental policy analysis,
- legal reference extraction.

---

# 5. Core User Problems

## User Problem 1

> “I do not know which regulation contains the information I need.”

---

## User Problem 2

> “Searching through multiple PDFs manually is extremely slow.”

---

## User Problem 3

> “I can find regulations, but I cannot easily understand the relevant sections.”

---

## User Problem 4

> “I need answers with legal references I can trust.”

---

# 6. Product Scope

# MVP Scope

The MVP focuses ONLY on:
- semantic regulation search,
- conversational retrieval,
- and citation-grounded answers.

---

## Included Features (MVP)

| Feature | Description |
|---|---|
| Conversational Chat Interface | Natural-language question answering |
| PDF Regulation Ingestion | Upload and process regulation PDFs |
| Semantic Search | Context-aware retrieval |
| Citation-Based Answers | Responses include source references |
| Regulation Metadata Indexing | Basic document classification |
| Conversation Session Memory | Short-term chat continuity |
| Source Reference Display | Display retrieved regulation sources |
| Google Drive-Based Document Source | PDFs stored in Google Drive |

---

## Explicit Non-Goals (MVP)

The following are intentionally excluded from MVP:

| Feature | Reason Excluded |
|---|---|
| Multi-Agent AI Systems | Overengineering for early stage |
| Advanced Analytics Dashboard | Not core to retrieval validation |
| Enterprise Role Management | Low priority for MVP |
| Mobile Applications | Web-first validation preferred |
| Automated Compliance Audits | Requires mature retrieval reliability |
| Real-Time Regulation Monitoring | Future-stage feature |
| Fine-Tuned Custom Models | Premature optimization |
| Multi-Language Translation | Not required for validation |

---

# 7. Core User Workflows

## Workflow 1 — Regulation Search

### User Goal
Find relevant environmental regulations quickly.

### Flow
1. User opens chat interface
2. User asks question in natural language
3. System retrieves relevant regulation chunks
4. AI generates grounded answer
5. Citations displayed alongside answer

### Success Outcome
User receives:
- relevant answer,
- supporting citations,
- and source references within seconds.

---

## Workflow 2 — Regulation Understanding

### User Goal
Understand a complex regulation section.

### Flow
1. User asks explanatory question
2. System retrieves related clauses
3. AI summarizes regulation context
4. Source references attached

### Success Outcome
User understands the regulation faster than manual reading.

---

## Workflow 3 — Research Assistance

### User Goal
Collect references for research or compliance documentation.

### Flow
1. User searches topic
2. System retrieves multiple relevant regulations
3. AI summarizes key points
4. Citations included for reference

### Success Outcome
User reduces manual research effort significantly.

---

# 8. User Experience Principles

## Principle 1 — Grounded Responses First

The system must prioritize:
- correctness,
- citations,
- and source traceability over conversational creativity.

---

## Principle 2 — Simplicity Over Complexity

The MVP should:
- minimize UI complexity,
- reduce unnecessary features,
- and focus on retrieval quality.

---

## Principle 3 — Fast Research Workflow

Users should:
- retrieve useful information quickly,
- with minimal interaction friction.

---

## Principle 4 — Trust Through Citations

Every important answer should:
- reference source documents,
- and clearly indicate legal grounding.

---

# 9. Success Metrics

## Primary Success Metrics

| Metric | Target |
|---|---|
| Retrieval Relevance | >80% perceived relevance |
| Citation Accuracy | >90% source correctness |
| Average Response Time | <5 seconds |
| Research Time Reduction | >50% faster than manual workflow |
| User Retention (Early Users) | Weekly repeated usage |

---

## MVP Validation Metrics

### Qualitative Metrics
- Users trust the answers
- Users prefer the platform over manual PDF search
- Users repeatedly use citation outputs

---

### Quantitative Metrics
- Number of successful queries
- Query completion rate
- Citation click rate
- Average session duration

---

# 10. Constraints

## Technical Constraints

| Constraint | Description |
|---|---|
| Free-Tier First | Infrastructure must prioritize low-cost services |
| Google Ecosystem Priority | Prefer Google-native tooling |
| Small-Team Friendly | Architecture must support solo/small team development |
| Fast Iteration | Avoid overengineering |
| AI-Assisted Development | Optimized for vibe coding workflows |

---

## Product Constraints

| Constraint | Description |
|---|---|
| Limited Initial Dataset | MVP starts with small regulation corpus |
| Regulatory Complexity | Legal interpretation remains difficult |
| PDF Quality Variability | Some documents may contain OCR issues |

---

# 11. Risks and Assumptions

## Key Risks

| Risk | Impact |
|---|---|
| Hallucinated Answers | Loss of trust |
| Poor Retrieval Quality | Low usefulness |
| Incorrect Citations | Legal reliability issues |
| OCR Extraction Errors | Retrieval degradation |
| Ambiguous Legal Language | Interpretation difficulties |

---

## Key Assumptions

| Assumption | Rationale |
|---|---|
| Users prefer conversational search | Easier than manual document navigation |
| Citations increase trust | Users require traceable answers |
| Retrieval quality matters more than UI polish | Core product value depends on answer quality |

---

# 12. Development Priorities

## Priority Order

### Priority 1 — Retrieval Quality
The system must retrieve relevant regulation content accurately.

---

### Priority 2 — Citation Reliability
Users must trust the sources and references.

---

### Priority 3 — Fast Research Workflow
The product must reduce manual effort significantly.

---

### Priority 4 — Simple User Experience
Avoid feature overload during MVP.

---

# 13. MVP Definition

## MVP Success Criteria

The MVP is considered successful if users can:
- ask environmental regulation questions,
- receive contextually relevant answers,
- view reliable citations,
- and complete research workflows faster than manual PDF search.

---

# 14. Product Philosophy

Lensa Adem should prioritize:
- retrieval quality,
- grounded responses,
- simplicity,
- and trustworthiness.

The product should avoid:
- unnecessary complexity,
- excessive AI features,
- and premature infrastructure scaling.

The long-term value of the platform depends primarily on:
- document quality,
- retrieval accuracy,
- and citation reliability.

Not on:
- UI complexity,
- model sophistication,
- or feature quantity.

---

# 15. Immediate Next Step After PRD

After this PRD is approved, the next document to create is:

```text
/architecture/mvp_architecture.md
```

This document should define:
- high-level system boundaries,
- RAG workflow,
- ingestion flow,
- and MVP technical architecture.

Detailed engineering specifications should only be created after the MVP architecture is finalized.