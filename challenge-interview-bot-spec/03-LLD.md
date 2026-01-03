# LLD – תכנון מפורט

## 1. State Machine – Manager Chat
### States
- INIT (טוען state מהשרת)
- ASKING (שאלה מוצגת)
- WAITING_MANAGER (מחכה לתשובת מנהל)
- CONFIRM (הבנתי ש... נכון? yes/no)
- FOLLOW_UP (שאלת המשך אחת)
- TOPIC_WRAP ("רוצה להוסיף עוד משהו בנושא?")
- FINISHED (הושלם)

### Transitions
INIT → ASKING
ASKING → WAITING_MANAGER
WAITING_MANAGER → (submit) → CONFIRM (אם feature on)
CONFIRM → ASKING (yes) | FOLLOW_UP (no/needs_clarification)
ASKING → TOPIC_WRAP (כאשר topic_confidence>=0.7 או answered>=2)
TOPIC_WRAP → ASKING (next topic) או ASKING (עוד שאלה)
FINISHED → send complete

## 2. אלגוריתם בחירת שאלה (Server-side)
Input:
- enabled questions list (by topic, ordered)
- answers history
- topic_state (confidence + covered_points)
- last messages (N=8)

Rules:
1) אם LLM מחזיר next_action=FOLLOW_UP → שאל follow-up אחת.
2) אחרת: בחר "שאלה הבאה" מתוך enabled questions שטרם נשאלה ולא סומנה כ-covered.
3) אם אין עוד שאלות Topic → move to next Topic פעיל.
4) אם אין עוד Topics → END.

## 3. נתוני כיסוי Topic
topic_state:
- confidence: 0..1
- covered_points: bullets מסכמים "מה למדנו"
- covered_questions: נשמר ב-chat_messages.meta או בטבלה ייעודית (לא חובה)

## 4. תיעוד שיחה
chat_messages:
- role: manager/bot/system
- content: טקסט
- meta: JSON (action, model, latency_ms, token_usage, covered_questions)

## 5. סיכום למייל
בניית HTML:
- Header: פרטי ריאיון + סטטוס + סטטיסטיקה
- לכל Topic:
  - "מה למדנו" (covered_points)
  - Q&A cards (שאלות שנשאלו + תשובות/דולג)
- Footer:
  - חסמים (בולטים)
  - סיכונים
  - Action Items מוצעים
