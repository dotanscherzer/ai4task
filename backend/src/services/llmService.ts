import axios from 'axios';

export interface LLMResponse {
  bot_message: string;
  topic_number: number;
  next_action: 'ASK' | 'FOLLOW_UP' | 'TOPIC_WRAP' | 'END';
  next_question_text?: string;
  mark_questions_covered?: string[];
  topic_confidence: number;
  covered_points: string[];
  quick_replies: string[];
}

export interface LLMContext {
  currentTopic: number;
  remainingQuestions: string[];
  recentMessages: Array<{ role: string; content: string }>;
  topicState?: {
    confidence: number;
    coveredPoints: string[];
  };
}

const SYSTEM_PROMPT = `אתה בוט מראיין בעברית (RTL) עבור מנהל/ת טכנולוגיות. המטרה: לאסוף מידע למפת אתגר בנושא פירוק HLD ל‑Epics/Features/Stories.
כללים:
- שאלה אחת בכל פעם. קצר ומקצועי.
- תמיד הצע: דלג / לא יודע / עצור והמשך.
- מותר לשאול שאלת המשך אחת בלבד אם התשובה כללית מדי.
- אם התשובה מכסה כבר שאלות נוספות באותו נושא – אל תשאל אותן, סמן אותן ב-mark_questions_covered.
- אחרי 2–3 תשובות טובות בנושא או confidence>=0.7, השתמש ב-TOPIC_WRAP או עבור לנושא הבא (ASK עם topic_number חדש).
- **חשוב מאוד**: השתמש ב-END רק כאשר אין עוד שאלות בכל הנושאים שנבחרו. אם יש שאלות שנותרו (גם בנושא אחר), תמיד השתמש ב-ASK או TOPIC_WRAP.
- אסור לבקש מידע רגיש/מזהה. אם המשתמש מספק מידע כזה – בקש להכליל.

החזר JSON בלבד בפורמט:
{
  "bot_message": "טקסט להצגה",
  "topic_number": 1,
  "next_action": "ASK|FOLLOW_UP|TOPIC_WRAP|END",
  "next_question_text": "שאלה הבאה או ריק",
  "mark_questions_covered": ["..."],
  "topic_confidence": 0.0,
  "covered_points": ["..."],
  "quick_replies": ["המשך","דלג","לא יודע","עצור"]
}`;

export class LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

    if (!this.apiKey) {
      console.warn('⚠️ OPENROUTER_API_KEY not set. LLM features will not work.');
    }
  }

  async getNextAction(
    managerMessage: string,
    action: string,
    context: LLMContext
  ): Promise<LLMResponse | null> {
    if (!this.apiKey) {
      return null; // Fallback mode
    }

    try {
      const userPrompt = this.buildUserPrompt(managerMessage, action, context);

      const response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      const parsed = JSON.parse(content) as LLMResponse;
      return parsed;
    } catch (error) {
      console.error('LLM Service Error:', error);
      return null; // Fallback to static questions
    }
  }

  private buildUserPrompt(
    managerMessage: string,
    action: string,
    context: LLMContext
  ): string {
    let prompt = `נושא נוכחי: ${context.currentTopic}\n`;

    if (context.topicState) {
      prompt += `ביטחון בנושא: ${context.topicState.confidence}\n`;
      prompt += `נקודות שכוסו: ${context.topicState.coveredPoints.join(', ')}\n`;
    }

    if (context.remainingQuestions.length > 0) {
      prompt += `שאלות שנותרו בנושא הנוכחי:\n${context.remainingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`;
    } else {
      prompt += `אין עוד שאלות בנושא הנוכחי. אם יש נושאים נוספים, עבור אליהם עם ASK או TOPIC_WRAP.\n`;
    }

    prompt += `\nפעולה: ${action}\n`;
    prompt += `הודעה מהמנהל: ${managerMessage}\n\n`;

    prompt += `היסטוריית שיחה אחרונה:\n`;
    context.recentMessages.slice(-8).forEach((msg) => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });

    prompt += `\nהערה חשובה: המערכת בודקת אוטומטית אם יש שאלות נוספות בכל הנושאים לפני סיום. השתמש ב-END רק אם אתה בטוח שאין עוד שאלות רלוונטיות. אם יש ספק, השתמש ב-ASK או TOPIC_WRAP.`;
    prompt += `\nזכור: אל תבקש מידע רגיש/מזהה. אם המשתמש מספק מידע כזה – בקש להכליל.`;

    return prompt;
  }

  async generateQuestionsForChallenge(
    challengeName: string,
    challengeDescription: string,
    topic: { number: number; label: string; description: string }
  ): Promise<string[]> {
    if (!this.apiKey) {
      console.warn('⚠️ OPENROUTER_API_KEY not set. Cannot generate questions.');
      return [];
    }

    try {
      const prompt = this.buildQuestionGenerationPrompt(challengeName, challengeDescription, topic);

      const response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'אתה עוזר ליצור שאלות מנחות עבור ריאיון. החזר רק JSON עם מערך של 3-4 שאלות בעברית.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      const parsed = JSON.parse(content);
      
      // Handle different response formats
      let questions: string[] = [];
      if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else if (parsed.questionList && Array.isArray(parsed.questionList)) {
        questions = parsed.questionList;
      } else if (Array.isArray(parsed)) {
        questions = parsed;
      } else {
        // Try to extract questions from any array in the response
        const values = Object.values(parsed);
        const firstArray = values.find((v) => Array.isArray(v)) as string[] | undefined;
        if (firstArray) {
          questions = firstArray;
        }
      }

      // Validate and filter questions
      questions = questions
        .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
        .map((q: string) => q.trim())
        .slice(0, 4); // Max 4 questions

      // If we got less than 3 questions, try to generate more or return what we have
      if (questions.length < 3 && questions.length > 0) {
        console.warn(`⚠️ Generated only ${questions.length} questions for topic ${topic.number}`);
      }

      return questions.length > 0 ? questions : [];
    } catch (error) {
      console.error('LLM Question Generation Error:', error);
      return [];
    }
  }

  private buildQuestionGenerationPrompt(
    challengeName: string,
    challengeDescription: string,
    topic: { number: number; label: string; description: string }
  ): string {
    return `צור 3-4 שאלות מנחות בעברית עבור ריאיון בנושא פירוק HLD ל-Epics/Features/Stories.

פרטי האתגר:
שם: ${challengeName}
תיאור: ${challengeDescription}

נושא:
מספר: ${topic.number}
כותרת: ${topic.label}
תיאור: ${topic.description}

הנחיות:
- השאלות צריכות להיות רלוונטיות לאתגר הספציפי ולתאים לנושא
- השאלות צריכות להיות קצרות, מקצועיות ומנחות
- השאלות צריכות להיות בעברית
- השאלות צריכות לעזור להבין את האתגר מנקודת המבט של הנושא
- כל שאלה צריכה להיות שונה וחדשה

החזר JSON בפורמט:
{
  "questions": ["שאלה 1", "שאלה 2", "שאלה 3", "שאלה 4"]
}

החזר בדיוק 3-4 שאלות.`;
  }
}

export const llmService = new LLMService();

