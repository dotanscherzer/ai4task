# DB SQL (Supabase) – Schema + Seed (מומלץ)

> הערה: זה קובץ Reference. להרצה בפועל, מומלץ להשתמש בגרסה עם RLS מלאה בהתאם למדיניות הארגון.
> אם אתה רוצה – אגזור לך "Schema Final" אחד לריצה לפי ההעדפה שלך (Admin-only + Manager via Edge).

## טבלאות (סיכום)
- interviews
- questions
- interview_questions
- chat_messages
- answers
- topic_state
- interview_sessions

## Seed שאלות
להכניס את רשימת השאלות לפי Topics 1–8 (כפי שהוגדר בשיחה).

## אינדקסים מומלצים
- interviews(share_token) unique
- answers(interview_id, topic_number, created_at)
- chat_messages(interview_id, created_at)
- interview_questions(interview_id, sort_order)

## RLS
- Admin: לפי auth.uid()
- Manager: אין direct DB access; משתמש רק ב-Edge Functions עם service role
