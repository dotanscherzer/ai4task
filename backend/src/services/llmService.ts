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
    const rawKey = process.env.OPENROUTER_API_KEY || '';
    this.apiKey = rawKey.trim();
    // Try different free model names - OpenRouter model naming may vary
    // Common free models: meta-llama/llama-3.1-8b-instruct, qwen/qwen-2.5-7b-instruct:free, mistralai/mistral-7b-instruct:free
    let modelValue = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct';
    // Clean up if the value includes the variable name (e.g., "OPENROUTER_MODEL=value")
    if (modelValue.includes('=')) {
      modelValue = modelValue.split('=').pop() || 'meta-llama/llama-3.1-8b-instruct';
    }
    this.model = modelValue.trim();
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    if (!this.apiKey) {
      console.warn('⚠️ OPENROUTER_API_KEY not set. LLM features will not work.');
    } else {
      console.log(`✅ OPENROUTER_API_KEY loaded successfully (length: ${this.apiKey.length}, prefix: ${this.apiKey.substring(0, 10)}...)`);
      console.log(`   Model: ${this.model}`);
      console.log(`   Base URL: ${this.baseUrl}`);
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

      const requestPayload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'llmService.ts:78',message:'getNextAction request',data:{model:this.model,baseUrl:this.baseUrl,hasApiKey:!!this.apiKey,requestPayload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      let response;
      try {
        response = await axios.post(
          this.baseUrl,
          requestPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://github.com/your-repo',
              'X-Title': 'Interview Bot'
            },
          }
        );
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'llmService.ts:105',message:'getNextAction error',data:{errorMessage:error?.message,status:error?.response?.status,responseData:error?.response?.data,model:this.model},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        throw error;
      }

      let content = response.data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      // Remove markdown code blocks if present
      content = content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Extract JSON if there's text before it (common with some models)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch && !content.trim().startsWith('{')) {
        content = jsonMatch[0];
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
    console.log(`   📋 Challenge: "${challengeName}"`);
    if (this.apiKey) {
      console.log(`      API Key: SET (length: ${this.apiKey.length}, prefix: ${this.apiKey.substring(0, 10)}...)`);
    } else {
      console.log(`      API Key: NOT SET`);
    }
    console.log(`      Model: ${this.model}`);
    console.log(`      Base URL: ${this.baseUrl}`);
    
    if (!this.apiKey) {
      console.warn(`   ⚠️ OPENROUTER_API_KEY not set. Cannot generate questions for topic ${topic.number}.`);
      return [];
    }

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, attempt - 2), 10000);
          console.log(`   🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const prompt = this.buildQuestionGenerationPrompt(challengeName, challengeDescription, topic);
        const systemInstruction = 'אתה עוזר ליצור שאלות מנחות עבור ריאיון. החזר רק JSON עם מערך של 3-4 שאלות בעברית.';
        
        console.log(`   📤 Sending request to OpenRouter (attempt ${attempt}/${maxRetries})...`);
        console.log(`      Prompt length: ${prompt.length} characters`);
        console.log(`      Challenge name: ${challengeName.substring(0, 50)}...`);
        console.log(`      Topic: ${topic.number} - ${topic.label}`);

        const requestPayload = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemInstruction
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'llmService.ts:198',message:'OpenRouter request payload',data:{model:this.model,baseUrl:this.baseUrl,hasApiKey:!!this.apiKey,apiKeyPrefix:this.apiKey?.substring(0,10),requestPayload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const startTime = Date.now();
        let response;
        try {
          response = await axios.post(
            this.baseUrl,
            requestPayload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://github.com/your-repo',
                'X-Title': 'Interview Bot'
              },
            }
          );
        } catch (error: any) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'llmService.ts:225',message:'OpenRouter request error',data:{errorMessage:error?.message,status:error?.response?.status,responseData:error?.response?.data,model:this.model},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          throw error;
        }
        const duration = Date.now() - startTime;
        console.log(`   ⏱️ LLM request completed in ${duration}ms`);
        console.log(`   📥 Response status: ${response.status}`);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'llmService.ts:240',message:'OpenRouter response success',data:{status:response.status,hasChoices:!!response.data.choices,choicesLength:response.data.choices?.length,hasContent:!!response.data.choices?.[0]?.message?.content,model:this.model},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        let content = response.data.choices?.[0]?.message?.content;
        if (!content) {
          console.error(`   ❌ No content in LLM response`);
          console.error(`      Response data: ${JSON.stringify(response.data).substring(0, 200)}...`);
          throw new Error('No content in LLM response');
        }

        // Remove markdown code blocks if present
        content = content.trim();
        if (content.startsWith('```json')) {
          content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          console.log(`   🔧 Removed markdown code block wrapper from response`);
        } else if (content.startsWith('```')) {
          content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
          console.log(`   🔧 Removed markdown code block wrapper from response`);
        }

        // Extract JSON if there's text before it (common with some models)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch && !content.trim().startsWith('{')) {
          content = jsonMatch[0];
          console.log(`   🔧 Extracted JSON from response with preceding text`);
        }

        console.log(`   📄 Response content length: ${content.length} characters`);
        console.log(`   📄 Response preview: ${content.substring(0, 100)}...`);

        // Try to parse JSON, with fallback for incomplete JSON
        let parsed: any;
        try {
          parsed = JSON.parse(content);
          console.log(`   ✅ Successfully parsed JSON response`);
        } catch (parseError: any) {
          console.warn(`   ⚠️ JSON parse error, attempting to fix...`);
          // Try to fix incomplete JSON by closing brackets
          let fixedContent = content.trim();
          
          // Count open/close brackets
          const openBraces = (fixedContent.match(/\{/g) || []).length;
          const closeBraces = (fixedContent.match(/\}/g) || []).length;
          const openBrackets = (fixedContent.match(/\[/g) || []).length;
          const closeBrackets = (fixedContent.match(/\]/g) || []).length;
          
          // Close missing brackets
          if (openBrackets > closeBrackets) {
            fixedContent += ']'.repeat(openBrackets - closeBrackets);
          }
          if (openBraces > closeBraces) {
            fixedContent += '}'.repeat(openBraces - closeBraces);
          }
          
          // Try parsing again
          try {
            parsed = JSON.parse(fixedContent);
            console.log(`   ✅ Successfully parsed fixed JSON`);
          } catch (secondParseError: any) {
            // Last resort: try to extract questions even from incomplete JSON
            const questionsMatch = fixedContent.match(/"questions"\s*:\s*\[(.*?)\]/s);
            if (questionsMatch) {
              const questionsText = questionsMatch[1];
              // Extract individual question strings
              const questionMatches = questionsText.match(/"([^"]+)"/g);
              if (questionMatches && questionMatches.length > 0) {
                const questions = questionMatches.map((q: string) => q.replace(/^"|"$/g, ''));
                console.log(`   ✅ Extracted ${questions.length} questions from incomplete JSON`);
                return questions.slice(0, 4);
              }
            }
            throw parseError;
          }
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
          return questions;
        } else {
          throw new Error('No valid questions extracted from response');
        }

      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error (429)
        if (error.response?.status === 429) {
          console.error(`   ❌ Rate limit exceeded (429) on attempt ${attempt}`);
          if (attempt < maxRetries) {
            // Wait longer for rate limit
            const delay = Math.min(5000 * attempt, 30000);
            console.log(`   ⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Check if it's a JSON parsing error
        if (error.message?.includes('JSON') || error.message?.includes('parse')) {
          console.error(`   ❌ JSON parsing error on attempt ${attempt}`);
          if (attempt < maxRetries) {
            continue; // Retry
          }
        }
        
        // For other errors, log and break
        if (attempt === maxRetries) {
          console.error(`   ❌ LLM Question Generation Error for topic ${topic.number} after ${maxRetries} attempts:`);
          console.error(`      Error type: ${error.constructor?.name || 'Unknown'}`);
          console.error(`      Error message: ${error.message || error}`);
          if (error.response) {
            console.error(`      Response status: ${error.response.status}`);
            console.error(`      Response data: ${JSON.stringify(error.response.data).substring(0, 300)}...`);
          }
          if (error.stack) {
            console.error(`      Stack trace: ${error.stack.substring(0, 300)}...`);
          }
        }
      }
    }

    return []; // Return empty array if all retries failed
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

