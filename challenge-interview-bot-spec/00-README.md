# Challenge Interview Bot – מסמכי אפיון (Cursor)
תאריך: 2026-01-03

## מה זה?
אפליקציית Web לראיון מנהלים (צ'אט חכם) לבניית "מפת אתגר" בנושא:
**פירוק HLD ל‑Epics/Features/Stories**.

### תוצרים מרכזיים
- מסך Admin: יצירת ריאיון, בחירת נושאים/שאלות, קבלת לינק חד-פעמי, צפייה בתשובות, שליחת סיכום במייל.
- מסך Manager: צ'אט AI אדפטיבי, דילוג/עצירה/המשך, שליחה/הגשה בסיום.
- Backend: Supabase (DB + Auth + Edge Functions)
- LLM: OpenRouter
- Email: Resend
- יעד מייל ברירת מחדל: dotan.scherzer@gmail.com

## מבנה הקבצים
1. `01-PRD.md` – אפיון מוצר
2. `02-HLD.md` – ארכיטקטורה גבוהה
3. `03-LLD.md` – תכנון מפורט (Flows, States)
4. `04-ERD.md` – ישויות וקשרים
5. `05-DB-SQL.md` – סכמת DB + Seed
6. `06-EDGE-API.md` – חוזי API ל-Edge Functions + דוגמאות
7. `07-FRONTEND.md` – מסכים/קומפוננטות/State
8. `08-SECURITY-RLS.md` – אבטחה, RLS, Tokens, סודיות
9. `09-DEPLOYMENT.md` – פריסה והגדרות סביבה
10. `10-AI-PROMPTS.md` – System Prompt + כללי התנהגות בוט

## הנחיות לפיתוח ב-Cursor
- לעבוד בשלבים: DB → Functions → UI Manager → UI Admin → Email → AI polish.
- לשמור על RTL מלא.
- לא לאסוף/לשמור מידע רגיש (PII/נתונים אמיתיים של לקוחות).
