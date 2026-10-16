# AI safety data expansion

## What this change does

The migration `20261017090000_expand_ai_skills_open_source_guidance.sql` appends an additive, idempotent section to each of the six existing AI skills in `public.ai_skills`. It improves the runtime instructions for assessing scams, suspicious links, AI-generated media, misleading text, and suspicious calls.

It does **not** retrain the underlying language models, scrape the web, import a denylist, or claim that every referenced source has been exhaustively reviewed. It only updates skill text already stored in Supabase when the migration is applied.

## Sources to review and ingest through a controlled pipeline

- ChongLuaDao, article on pirate websites and malware: https://chongluadao.vn/blog/en/2026/07/web-lau-cam-bay-ma-doc-sau-chu-mien-phi/
- Lao Động, signs of AI-generated comments used to manipulate public opinion: https://laodong.vn/thoi-su/nhan-dien-dau-hieu-binh-luan-do-ai-tao-nham-kich-dong-loi-keo-du-luan-1736967.ldo
- Dân trí, report on pirate game/movie websites: https://dantri.com.vn/cong-nghe/hang-loat-web-game-phim-lau-hoat-dong-tro-lai-20260721004354168.htm
- ChongLuaDao denylist landing page: https://chongluadao.vn/database/denylist

The supplied ChongLuaDao URLs for two additional articles were truncated in the request, and the YouTube video has not been independently reviewed. Do not mark these as ingested until their exact content and provenance have been checked.

## Recommended dataset record

Store one record per observation, not one record per article:

```json
{
  "id": "stable-record-id",
  "record_type": "url|message|email|article_claim|image|video|phone_signal",
  "label": "malicious|benign|uncertain",
  "category": "phishing|malware|impersonation|misinformation|privacy|other",
  "observed_indicators": ["specific observable signal"],
  "explanation": "Why this label is supported",
  "source_url": "https://source.example/item",
  "source_published_at": null,
  "collected_at": "YYYY-MM-DD",
  "last_verified_at": null,
  "confidence": "low|medium|high",
  "review_status": "pending|reviewed|rejected",
  "license_or_terms": "record permitted basis for reuse",
  "redacted": true
}
```

Do not put passwords, OTPs, full personal phone numbers, personal addresses, account identifiers, or unnecessary private conversations into the dataset. Use synthetic examples when a real sample would expose personal information.

## Ingestion rules

1. Preserve the source URL, publication/collection timestamps, and reuse terms.
2. Deduplicate normalized URLs and near-identical text while retaining source references.
3. Separate confirmed malicious, confirmed benign, and uncertain records. A denylist entry is a signal to investigate, not permanent proof that a domain is malicious.
4. Keep raw source data separate from the compact runtime skill prompt. For large domain lists, use a server-side lookup/index with freshness and review metadata.
5. Do not infer that content is AI-generated from writing style alone. Do not infer a URL is malicious from its top-level domain alone.
6. Split train/validation/test data by campaign, domain family, or source where possible to reduce leakage from near-duplicates.
7. Measure precision, recall, F1, false-positive rate, and false-negative rate per category. Record model/skill versions and date every evaluation.
8. Review changes before publishing to the live skill table. Keep a rollback copy of the previous skill content.

## Rollout checklist

- [ ] Confirm migration environment and database backup.
- [ ] Apply the migration in staging first.
- [ ] Verify all six skill keys were updated and each version was incremented.
- [ ] Run one benign and one suspicious test per supported check type.
- [ ] Check output schema, uncertainty language, and absence of personal data.
- [ ] Review false positives before production rollout.
- [ ] Ingest additional source records only after licensing, privacy, and label review.

## Important limitation

Adding skill instructions is retrieval/prompt knowledge, not model-weight training. A true fine-tuning job would require an approved training dataset, an available fine-tuning interface/model, train/validation separation, and a separate evaluation and deployment process.
