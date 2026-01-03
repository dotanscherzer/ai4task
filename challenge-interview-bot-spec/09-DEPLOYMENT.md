# Deployment – שלבים ו-ENV

## 1) Supabase
- ליצור פרויקט
- להריץ schema + seed
- להגדיר Auth (Admin)
- להעלות Edge Functions:
  - manager_get_state
  - manager_post_message
  - manager_complete
  - send_interview_email

## 2) Environment Variables (Supabase Functions Secrets)
- OPENROUTER_API_KEY=...
- OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
- RESEND_API_KEY=...
- FROM_EMAIL=Challenge Bot <noreply@yourdomain.com>

## 3) Frontend
- .env
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - (לא לשים service key בקליינט!)

## 4) Smoke Test
- create interview
- open manager link
- answer 2 questions
- complete
- send email
