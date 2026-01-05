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
  private baseUrl: string;

  constructor() {
    const rawKey = process.env.GEMINI_API_KEY || '';
    this.apiKey = rawKey.trim();
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not set. LLM features will not work.');
    } else {
      console.log(`✅ GEMINI_API_KEY loaded successfully (length: ${this.apiKey.length}, prefix: ${this.apiKey.substring(0, 10)}...)`);
      console.log(`   Model: ${this.model}`);
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
      
      // Combine system prompt with user prompt for Gemini
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: fullPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
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
    console.log(`   🔧 LLM Service: Starting question generation for topic ${topic.number}`);
    if (this.apiKey) {
      console.log(`      API Key: SET (length: ${this.apiKey.length}, prefix: ${this.apiKey.substring(0, 10)}...)`);
    } else {
      console.log(`      API Key: NOT SET`);
    }
    console.log(`      Model: ${this.model}`);
    console.log(`      Base URL: ${this.baseUrl}`);
    
    if (!this.apiKey) {
      console.warn(`   ⚠️ GEMINI_API_KEY not set. Cannot generate questions for topic ${topic.number}.`);
      return [];
    }

    try {
      const prompt = this.buildQuestionGenerationPrompt(challengeName, challengeDescription, topic);
      
      // Combine system instruction with prompt for Gemini
      const systemInstruction = 'אתה עוזר ליצור שאלות מנחות עבור ריאיון. החזר רק JSON עם מערך של 3-4 שאלות בעברית.';
      const fullPrompt = `${systemInstruction}\n\n${prompt}`;
      
      console.log(`   📤 Sending request to Gemini...`);
      console.log(`      Prompt length: ${fullPrompt.length} characters`);
      console.log(`      Challenge name: ${challengeName.substring(0, 50)}...`);
      console.log(`      Topic: ${topic.number} - ${topic.label}`);

      const startTime = Date.now();
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: fullPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const duration = Date.now() - startTime;
      console.log(`   ⏱️ LLM request completed in ${duration}ms`);
      console.log(`   📥 Response status: ${response.status}`);

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.error(`   ❌ No content in LLM response`);
        console.error(`      Response data: ${JSON.stringify(response.data).substring(0, 200)}...`);
        throw new Error('No content in LLM response');
      }

      console.log(`   📄 Response content length: ${content.length} characters`);
      console.log(`   📄 Response preview: ${content.substring(0, 100)}...`);

      let parsed: any;
      try {
        parsed = JSON.parse(content);
        console.log(`   ✅ Successfully parsed JSON response`);
      } catch (parseError: any) {
        console.error(`   ❌ Failed to parse JSON response`);
        console.error(`      Parse error: ${parseError.message}`);
        console.error(`      Content preview: ${content.substring(0, 500)}...`);
        throw new Error(`Failed to parse LLM response as JSON: ${parseError.message}`);
      }
      
      // Handle different response formats
      let questions: string[] = [];
      console.log(`   🔍 Parsing response structure...`);
      console.log(`      Response keys: ${Object.keys(parsed).join(', ')}`);
      
      if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
        console.log(`   ✅ Found questions in 'questions' array (${questions.length} items)`);
      } else if (parsed.questionList && Array.isArray(parsed.questionList)) {
        questions = parsed.questionList;
        console.log(`   ✅ Found questions in 'questionList' array (${questions.length} items)`);
      } else if (Array.isArray(parsed)) {
        questions = parsed;
        console.log(`   ✅ Response is direct array (${questions.length} items)`);
      } else {
        // Try to extract questions from any array in the response
        const values = Object.values(parsed);
        const firstArray = values.find((v) => Array.isArray(v)) as string[] | undefined;
        if (firstArray) {
          questions = firstArray;
          console.log(`   ✅ Found array in response values (${questions.length} items)`);
        } else {
          console.warn(`   ⚠️ No array found in response structure`);
          console.warn(`      Response structure: ${JSON.stringify(parsed).substring(0, 300)}...`);
        }
      }

      // Validate and filter questions
      const originalCount = questions.length;
      questions = questions
        .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
        .map((q: string) => q.trim())
        .slice(0, 4); // Max 4 questions

      if (originalCount !== questions.length) {
        console.log(`   🔍 Filtered questions: ${originalCount} → ${questions.length} (removed invalid/empty)`);
      }

      // If we got less than 3 questions, try to generate more or return what we have
      if (questions.length < 3 && questions.length > 0) {
        console.warn(`   ⚠️ Generated only ${questions.length} questions for topic ${topic.number} (expected 3-4)`);
      }

      if (questions.length > 0) {
        console.log(`   ✅ Successfully extracted ${questions.length} questions`);
        questions.forEach((q, i) => {
          console.log(`      ${i + 1}. ${q.substring(0, 60)}${q.length > 60 ? '...' : ''}`);
        });
      } else {
        console.warn(`   ⚠️ No valid questions extracted from LLM response`);
      }

      return questions.length > 0 ? questions : [];
    } catch (error: any) {
      console.error(`   ❌ LLM Question Generation Error for topic ${topic.number}:`);
      console.error(`      Error type: ${error.constructor?.name || 'Unknown'}`);
      console.error(`      Error message: ${error.message || error}`);
      if (error.response) {
        console.error(`      Response status: ${error.response.status}`);
        console.error(`      Response data: ${JSON.stringify(error.response.data).substring(0, 300)}...`);
      }
      if (error.stack) {
        console.error(`      Stack trace: ${error.stack.substring(0, 300)}...`);
      }
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

