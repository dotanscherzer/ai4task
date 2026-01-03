# Security / RLS / Privacy

## עקרונות
- Admin הוא משתמש מאומת (Supabase Auth).
- Manager אינו מאומת; מזוהה רק לפי share_token.

## Token
- share_token: UUID אקראי, unique
- מומלץ: אפשרות "Revoke token" (לסובב/לייצר חדש)

## DB Access
- Admin: policies לפי auth.uid()
- Manager: גישה רק דרך Edge Functions עם service role.
  הסיבה: הפחתת מורכבות RLS, מניעת חשיפה.

## Privacy
- לא לאסוף/לשמור PII או מידע מסווג.
- bot מציג אזהרה אם מודבק מידע רגיש ומבקש ניסוח כללי.

## Audit
- chat_messages + meta שומרים trace של החלטות בוט (action, covered_questions, confidence)
- interview_sessions שומר start/end + counters
