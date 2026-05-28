# dataset_rules.md

## Naming Conventions

Type: snake_case (lowercase with underscores)

Document Name Format: regulationtype_number_year_about.pdf

Example: uu_32_2009_pplh.pdf


# Metadata

Example structure:
```json
{
    "title": "Perlindungan dan Pengelolaan Lingkungan Hidup",
    "regulation_type": ["Undang-Undang", "uu"],
    "number": 32,
    "year": 2009,
    "issuing_authority": "Pemerintah Republik Indonesia",
    "topic_tags": [
        "lingkungan hidup",
        "perlindungan lingkungan hidup",
        "pengelolaan lingkungan hidup",
        "pencemaran lingkungan",
        "kerusakan lingkungan",
        "penegakan hukum lingkungan"
    ],
    "status_active": true,
    "doc_url": "https://drive.google.com/file/d/1sDAhsmQtEVkO-WE19yYN3bCY5iR83FVc/view?usp=drive_link"_
}
```

# Ingestion Lifecycle,

Each document should later have lifecycle stages:

| Stage | Meaning |
|-------|---------|
| uploaded | raw upload |
| validated | naming validated |
| extracted | text extracted |
| chunked | chunk pipeline completed |
| embedded | embeddings created |
| indexed | vector DB indexed |
| active | searchable |
| archived | deprecated |

# Document Quality Standards

Reject PDFs if:

- corrupted,
- scanned unreadably,
- duplicate,
- incomplete,
- unofficial source,
- low OCR quality.