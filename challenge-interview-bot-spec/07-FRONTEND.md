# Frontend – מסכים וקומפוננטות

## Route: /admin
### Components
- AdminLayout (RTL)
- InterviewList
- CreateInterviewModal
- InterviewDetails (tabs by topic)
- SendEmailButton

### Create Interview flow
1) טופס → POST to DB: interviews
2) יצירת interview_questions לפי enabled שאלות:
   - לקחת את default questions + custom questions
3) הצגת share link: /i/{share_token}

## Route: /i/:share_token
### Components
- ManagerChatPage
- ChatThread
- MessageBubble (bot/manager)
- QuickReplies
- TopicHeader

### Data flow
- onLoad: call manager_get_state
- onSend: call manager_post_message
- finish: call manager_complete

### UX Notes
- תמיד שאלה אחת בלבד במסך
- Scroll to bottom
- מצב Offline/Retry לקריאת Edge Function
