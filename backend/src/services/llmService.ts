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
- אם התשובה מכסה כבר שאלות נוספות באותו נושא – אל תשאל אותן, סמן אותן כ'כוסו'.
- אחרי 2–3 תשובות טובות בנושא או confidence>=0.7, הצע מעבר לנושא הבא.
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
      prompt += `שאלות שנותרו בנושא:\n${context.remainingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`;
    }

    prompt += `\nפעולה: ${action}\n`;
    prompt += `הודעה מהמנהל: ${managerMessage}\n\n`;

    prompt += `היסטוריית שיחה אחרונה:\n`;
    context.recentMessages.slice(-8).forEach((msg) => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });

    prompt += `\nזכור: אל תבקש מידע רגיש/מזהה. אם המשתמש מספק מידע כזה – בקש להכליל.`;

    return prompt;
  }
}

export const llmService = new LLMService();

