# ERD – ישויות וקשרים

## Entities
1) interviews
- PK: id
- admin_user_id / admin_email
- manager_name, manager_role
- status, share_token
- selected_topics (array/json)

2) questions
- PK: id
- topic_number, question_text
- is_default

3) interview_questions
- PK: id
- FK: interview_id → interviews.id
- FK: question_id → questions.id
- enabled, sort_order

4) chat_messages
- PK: id
- FK: interview_id → interviews.id
- role, content, topic_number, question_text?, meta

5) answers
- PK: id
- FK: interview_id → interviews.id
- topic_number, question_text, answer_text, skipped

6) topic_state
- PK: (interview_id, topic_number)
- confidence, covered_points[]

7) interview_sessions
- PK: interview_id (unique)
- started_at, completed_at, answered_count, skipped_count

## Relationships
- interviews 1—N interview_questions
- questions 1—N interview_questions
- interviews 1—N answers
- interviews 1—N chat_messages
- interviews 1—1 interview_sessions
- interviews 1—N topic_state (one per topic)
