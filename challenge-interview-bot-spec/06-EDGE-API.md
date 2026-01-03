# Edge API – חוזים + דוגמאות (Supabase Edge Functions)

## 1) POST /functions/v1/manager_get_state
### Request
{
  "share_token": "uuid"
}
### Response
{
  "interview": { "id":"...", "manager_name":"...", "status":"in_progress", "selected_topics":[1,2,3] },
  "questions": [
    { "topic_number": 1, "question_text": "..." }
  ],
  "topic_state": [
    { "topic_number": 1, "confidence": 0.5, "covered_points": ["..."] }
  ],
  "progress": { "answered": 3, "skipped": 1 },
  "current": { "topic_number": 2, "next_question_text": "..." },
  "recent_messages": [ ... ]
}

## 2) POST /functions/v1/manager_post_message
### Request
{
  "share_token": "uuid",
  "message": "תשובת המנהל ...",
  "action": "answer|skip|pause|resume|confirm_yes|confirm_no"
}
### Response (from server; includes LLM decision)
{
  "bot_message": "הבנתי ש...",
  "next_action": "ASK",
  "topic_number": 3,
  "next_question_text": "מה התדירות: כמה דרישות/חודש ...?",
  "quick_replies": ["המשך","דלג","לא יודע","עצור"],
  "topic_confidence": 0.72,
  "covered_points": ["..."],
  "mark_questions_covered": ["..."]
}

## 3) POST /functions/v1/manager_complete
Request: { "share_token": "uuid" }
Response: { "ok": true, "interview_id": "uuid" }

## 4) POST /functions/v1/send_interview_email
Request: { "interview_id": "uuid" }
Response: { "ok": true }

## 5) OpenRouter – דוגמת קריאה (server-side)
POST https://openrouter.ai/api/v1/chat/completions
Headers:
- Authorization: Bearer OPENROUTER_API_KEY
- Content-Type: application/json
Body:
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    {"role":"system","content":"<SYSTEM PROMPT>"},
    {"role":"user","content":"<context + manager message>"}
  ],
  "response_format": {"type":"json_object"}
}
