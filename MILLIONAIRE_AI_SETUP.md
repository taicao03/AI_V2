# Millionaire AI Setup

## 1) Apply SQL patch

Run:

```sql
\i supabase/millionaire_patch.sql
```

Or paste the file content into Supabase SQL Editor.

## 1.1) Optional: Import extra AI seed questions

```sql
\i supabase/millionaire_ai_seed_batch_01.sql
```

File nay se bo sung them nhieu cau hoi AI-generated da verify san va an toan khi chay lai (skip cau trung `question_text`).

## 2) Game route

- Web path: `/games/millionaire`

## 3) Add AI-generated questions (admin only)

Use RPC:

```sql
select public.millionaire_admin_upsert_ai_question(
  'YOUR_SESSION_TOKEN',
  jsonb_build_object(
    'topic', 'science',
    'difficulty', 6,
    'question_text', 'Nguon nang luong chinh cua Mat Troi la qua trinh nao?',
    'options', jsonb_build_array(
      'Phan hach',
      'Nong chay hat nhan',
      'Dot than',
      'Phong dien'
    ),
    'correct_choice', 1,
    'explanation', 'Mat Troi tao nang luong chu yeu tu fusion.',
    'source_provider', 'openai',
    'source_model', 'gpt-5',
    'source_prompt_version', 'millionaire-v1',
    'confidence_score', 0.92,
    'verification_status', 'verified',
    'citation_urls', jsonb_build_array('https://example.com/reference')
  )
);
```

## 4) Recommended AI pipeline

1. Generate candidate questions via backend worker/Edge Function.
2. Run verifier pass (duplicate check + ambiguity + answer validation).
3. Only insert verified payloads via `millionaire_admin_upsert_ai_question`.
