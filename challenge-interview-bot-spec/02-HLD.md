# HLD – ארכיטקטורה גבוהה

## 1. רכיבים
1) Frontend (React/TS)
- Admin App: `/admin`
- Manager App: `/i/:share_token`

2) Supabase
- Postgres DB
- Auth (רק ל-Admin)
- Edge Functions (Server-side logic + token validation)

3) OpenRouter (LLM)
- Decision engine לשיחה: next question, follow-up, topic wrap, end
- מחזיר JSON בלבד לפי schema

4) Resend (Email)
- שליחת HTML מסכם ל-Admin

## 2. תרשים זרימה גבוה
Admin:
Create Interview → DB: interviews + interview_questions → Share link

Manager:
Open Link → Edge: manager_get_state → Chat UI
Message → Edge: manager_post_message → (save) → call LLM → (save bot msg + update topic_state)
Finish → Edge: manager_complete
Admin → Edge: send_interview_email → Resend

## 3. עקרונות אבטחה
- Manager לא ניגש ישירות ל-DB (למנוע RLS מורכב). כל פעולות Manager דרך Edge Functions עם service role.
- token הוא UUID אקראי; מומלץ אפשרות לבטל/לסובב token.
- אין שמירת מידע רגיש. bot מזהיר ומבקש הכללה.

## 4. Non-Functional
- זמינות: תלות ב-OpenRouter; fallback לשאלות סטטיות.
- Logging: chat_messages.meta כולל latency, model, token_usage (אם זמין).
- ביצועים: קריאות LLM לכל הודעה; לשמור היסטוריה קצרה (last N messages) לקריאה.
