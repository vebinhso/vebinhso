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


## Additional Vietnamese sources reviewed

These articles were reviewed for defensive patterns and are **not copied wholesale into a training corpus**. The guidance below is a synthesis of their warning signs and recommended verification steps.

- Pháp luật & Sức khỏe đời sống, “Cảnh giác bẫy 'combo du lịch giá rẻ'…”: https://phapluat.suckhoedoisong.vn/canh-giac-bay-combo-du-lich-gia-re-nhieu-chieu-lua-tinh-vi-khien-du-khach-mat-trang-tien-dat-coc-272609.html
  - Patterns: unusually low prices, pressure to transfer quickly, fake/renamed social pages, staged comments, booking codes that only hold a reservation, extra “verification” fees, lookalike booking sites.
  - Defensive checks: contact the airline/hotel using independently found official contact details; confirm that booking/payment is complete; compare prices and booking status with official channels.
- Thời báo Ngân hàng, “Bẫy tình cảm trên không gian mạng”: https://thoibaonganhang.vn/bay-tinh-cam-tren-khong-gian-mang-180781.html
  - Patterns: rapidly built trust, fabricated identity/story, requests for money, investment pitches, extra tax/fee to withdraw funds, cutting contact after receiving money.
  - Defensive checks: do not send money or private images to an unverified online contact; ask a trusted adult/person for a second opinion; verify identity independently.
- Nhân Dân, “Cảnh giác chiêu trò giả mạo hoàn tiền và đơn hàng”: https://nhandan.vn/canh-giac-chieu-tro-gia-mao-hoan-tien-va-don-hang-post955578.html
  - Patterns: impersonating a marketplace or delivery service, fake refund/order issue, suspicious link or app, asking for bank login details or OTP.
  - Defensive checks: open the official app independently, never share OTP/password, do not install an unknown app to receive a refund.
- ChongLuaDao, investigation into the Haotian AI deepfake network: https://chongluadao.vn/posts/chong-lua-dao-tham-gia-dieu-tra-mang-luoi-deepfake-haotian-ai-tai-dong-nam-a
  - Patterns: real-time face-swapping used to impersonate someone on video calls and support romance/investment scams.
  - Defensive checks: a realistic video is not proof of identity; verify urgent requests through a separate known channel. Deepfake detectors and visual “tests” can be wrong.
- Facebook share post: https://www.facebook.com/share/p/1E3nc4ZbLM/
  - The post could not be independently read from the supplied share link, so it is recorded as **pending review**, not treated as ingested evidence.

## How the new sources are used

The migration adds compact, safety-oriented guidance to existing skill prompts for suspicious text, links, phone calls, images and videos. It does not store full articles or claim article-level model training. These are general indicators to investigate, not automatic rules: a low price, romantic language, a blue check, a booking code, or a video artifact alone is not enough to label a person or message as fraudulent.

## Small synthetic evaluation set

Use the following cases as **initial manual evaluation examples only**. They are fictional, should not be represented as real incidents, and are not yet a fine-tuning dataset. Reviewers should check whether the assistant explains the signals, recommends independent verification, avoids asking for sensitive information, and expresses uncertainty where evidence is incomplete.

| Case ID | Scenario | Expected response |
|---|---|---|
| SYN-TRAVEL-01 | A social page offers a resort package far below normal price, demands an immediate transfer to a personal account, and says only one place remains. | Flag elevated risk; verify price and booking directly with the resort using independently found contact details; do not transfer under pressure. |
| SYN-REFUND-01 | A text says a parcel refund is waiting and asks the recipient to follow a link and enter bank login and OTP. | Flag high risk; do not open the link or share OTP; check the order in the official app. |
| SYN-ROMANCE-01 | An online contact quickly professes love, then asks for an “investment deposit” and says the funds can only be withdrawn after paying a tax. | Explain romance/investment scam indicators; do not pay; consult a trusted person and verify independently. |
| SYN-DEEPFAKE-01 | A video call appears to show a relative asking urgently for money and secrecy. | Do not treat the video alone as proof; call the relative on a known number or verify with another trusted person before acting. |
| SYN-BENIGN-01 | An official travel company lists a package at a normal price and the user independently opens its official website to check terms; no sensitive data or urgent payment is requested. | Do not label it a scam without evidence; recommend normal verification and clearly state uncertainty. |
| SYN-UNCERTAIN-01 | A friend shares a screenshot of a “refund” but the original sender, URL and order details are missing. | Mark uncertain; ask for non-sensitive context or advise checking the official app, without requesting account numbers, passwords or OTPs. |

For real training or fine-tuning, create a larger approved dataset with many independent examples per category, verified labels, privacy redaction, rights/terms review, and separate train/validation/test splits. Do not train on article text copied without permission or on private messages containing personal data. Keep the evaluation set separate from training data to avoid inflated scores.
