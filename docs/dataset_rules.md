Document:

naming conventions,
metadata rules,
ingestion lifecycle,
PDF quality standards.


1. Naming Conventions

Document Name Format: filename.ext

Type: snake_case (lowercase with underscores)

Example: peraturan_menteri_nomor_75_tahun_2019.pdf

Metadata: Full descriptive name in title field

2. Metadata Rules

Required Fields: title, regulation_type, number, year, issuing_authority, topic_tags, status_active, doc_url

Topic Tags: 3-5 relevant keywords

Status Active: true for currently valid regulations, false for revoked/superseded

Date Format: YYYY-MM-DD for effective_date and revoked_date

3. Ingestion Lifecycle

New Upload → Extraction → Validation → Metadata Enrichment → Ready

Process: Scheduled at 02.00 WIB daily

Automation: All steps are automated

4. PDF Quality Standards

Minimum Resolution: 300 DPI

File Size: < 20 MB

Format: PDF/A (ISO 19005) preferred, PDF 1.4 acceptable

Security: No encryption, no passwords