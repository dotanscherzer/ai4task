import express, { Request, Response } from 'express';
import { interviewService } from '../services/interviewService';
import { ChatMessage } from '../models/ChatMessage';
import { Answer } from '../models/Answer';
import { TopicState } from '../models/TopicState';
import { InterviewSession } from '../models/InterviewSession';
import { llmService } from '../services/llmService';
import { emailService } from '../services/emailService';
import { Challenge } from '../models/Challenge';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to filter out questions from covered_points
// Questions typically start with question words or end with question marks
function filterQuestionsFromCoveredPoints(coveredPoints: string[]): string[] {
  const questionIndicators = [
    'איך', 'מה', 'מי', 'למה', 'איפה', 'מתי', 'האם', 'איזה', 'כיצד', 
    'למעש', 'מהי', 'מהו', 'מהיי', 'מהוו', 'איך', 'כיצד', 'איך', 'מהי',
    'איך האתגר', 'איך ניתן', 'איך נדע', 'איך יכולים', 'איך יוכל', 'איך יכולה',
    'מהי הלוגיקה', 'מהי הקבוצה', 'מהי הסכנה', 'מהי כמות',
    'איזה אנשים', 'איזה סוגי', 'איזה Best', 'איזה בעיות',
    'למה לא', 'למה זה',
    'כיצד ניתן', 'כיצד יכול', 'כיצד AI',
    'האם ניתן', 'האם פתרון', 'האם תרשימי', 'האם נדרשת', 'האם נדרש',
    'מתי נוכלל',
    'באיזה דרך', 'באיזה אופן', 'באיזה צורה'
  ];
  
  return coveredPoints.filter((point: string) => {
    const trimmed = point.trim();
    
    // Skip empty points
    if (!trimmed) return false;
    
    // Check if it's a question (starts with question word or ends with ?)
    const isQuestion = questionIndicators.some((indicator) => 
      trimmed.startsWith(indicator) || trimmed.endsWith('?')
    );
    
    // Also check if it's very short (likely not a learning point)
    const isTooShort = trimmed.length < 10;
    
    // Check if it contains question patterns (like "איך...יכול")
    const hasQuestionPattern = /איך.*יכול|מה.*יכול|כיצד.*יכול|איך.*ניתן|מה.*ניתן/.test(trimmed);
    
    // Keep only if it's NOT a question, has reasonable length, and doesn't have question patterns
    return !isQuestion && !isTooShort && !hasQuestionPattern;
  });
}

// Helper function to find next topic with remaining questions
function findNextTopicWithQuestions(
  currentTopic: number,
  selectedTopics: number[],
  questions: any[],
  askedQuestions: string[]
): { topic: number; question: any } | null {
  // Start from current topic index
  const currentIndex = selectedTopics.indexOf(currentTopic);
  
  // Check all topics starting from current (including current)
  for (let i = 0; i < selectedTopics.length; i++) {
    const topicIndex = (currentIndex + i) % selectedTopics.length;
    const topic = selectedTopics[topicIndex];
    
    const topicQuestions = questions.filter(
      (q: any) => q.topicNumber === topic && q.enabled
    );
    
    const remainingQuestions = topicQuestions.filter(
      (q: any) => !askedQuestions.includes(q.questionText)
    );
    
    if (remainingQuestions.length > 0) {
      return { topic, question: remainingQuestions[0] };
    }
  }
  
  return null;
}

// Helper function to find the last question asked before a given timestamp
async function findLastQuestionBefore(
  interviewId: mongoose.Types.ObjectId,
  beforeTimestamp: Date | null
): Promise<any> {
  // First, try to find the last original question (not follow-up) before the timestamp
  const query: any = {
    interviewId,
    role: 'bot',
    questionText: { $exists: true, $ne: null },
    $or: [
      { isFollowUp: { $ne: true } },
      { isFollowUp: { $exists: false } }
    ],
  };
  
  if (beforeTimestamp) {
    query.createdAt = { $lt: beforeTimestamp };
  }
  
  let lastQuestion = await ChatMessage.findOne(query)
    .sort({ createdAt: -1 })
    .lean();
  
  // Fallback: if no question found with timestamp, try without timestamp (get the most recent question)
  if (!lastQuestion && beforeTimestamp) {
    const fallbackQuery: any = {
      interviewId,
      role: 'bot',
      questionText: { $exists: true, $ne: null },
      $or: [
        { isFollowUp: { $ne: true } },
        { isFollowUp: { $exists: false } }
      ],
    };
    
    lastQuestion = await ChatMessage.findOne(fallbackQuery)
      .sort({ createdAt: -1 })
      .lean();
  }
  
  // Final fallback: get any question (including follow-ups) if still nothing found
  if (!lastQuestion) {
    const finalQuery: any = {
      interviewId,
      role: 'bot',
      questionText: { $exists: true, $ne: null },
    };
    
    if (beforeTimestamp) {
      finalQuery.createdAt = { $lt: beforeTimestamp };
    }
    
    lastQuestion = await ChatMessage.findOne(finalQuery)
      .sort({ createdAt: -1 })
      .lean();
  }
  
  return lastQuestion;
}

router.post('/state', async (req: Request, res: Response) => {
  try {
    const { share_token } = req.body;

    if (!share_token) {
      return res.status(400).json({ error: 'share_token is required' });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:106',message:'State endpoint entry',data:{share_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const data = await interviewService.getInterviewByToken(share_token);
    if (!data) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:114',message:'Interview not found',data:{share_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return res.status(404).json({ error: 'Interview not found' });
    }

    const { interview, questions, topicStates, session } = data;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:120',message:'Interview data loaded',data:{interviewId:interview._id.toString(),challengeId:interview.challengeId?.toString(),selectedTopics:interview.selectedTopics,questionsCount:questions.length,questionsByTopic:interview.selectedTopics.map((t:number)=>({topic:t,count:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).length})),topicStatesCount:topicStates.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const interviewId = new mongoose.Types.ObjectId(interview._id);

    // Get recent messages
    const recentMessages = await ChatMessage.find({
      interviewId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get answers for progress
    const answers = await Answer.find({ interviewId }).lean();
    // Create set of valid question texts from questions array
    const questionTexts = new Set(
      questions
        .filter((q: any) => interview.selectedTopics.includes(q.topicNumber) && q.enabled)
        .map((q: any) => q.questionText)
    );
    // Count unique questions (only count answers for questions that exist in questions array)
    const uniqueAnsweredQuestions = new Set(
      answers
        .filter((a) => !a.skipped && questionTexts.has(a.questionText))
        .map((a) => a.questionText)
    );
    const uniqueSkippedQuestions = new Set(
      answers
        .filter((a) => a.skipped && questionTexts.has(a.questionText))
        .map((a) => a.questionText)
    );
    const answered = uniqueAnsweredQuestions.size;
    const skipped = uniqueSkippedQuestions.size;
    
    // Calculate total enabled questions for selected topics
    const totalQuestions = questions.filter(
      (q: any) => interview.selectedTopics.includes(q.topicNumber) && q.enabled
    ).length;

    // Determine current topic and next question
    const currentTopicState = topicStates.find((ts: any) => ts.confidence < 0.7) || topicStates[0];
    const currentTopic = currentTopicState?.topicNumber || interview.selectedTopics[0];
    const topicQuestions = questions.filter((q: any) => q.topicNumber === currentTopic && q.enabled);

    // Get all questions that have already been asked (from bot messages)
    const askedQuestionsFromMessages = await ChatMessage.find({
      interviewId,
      role: 'bot',
      questionText: { $exists: true, $ne: null },
    })
      .distinct('questionText')
      .lean();

    // Get all questions marked as covered in previous messages
    const coveredQuestionsFromMeta = await ChatMessage.find({
      interviewId,
      role: 'bot',
      'meta.coveredQuestions': { $exists: true, $ne: [] },
    })
      .select('meta.coveredQuestions')
      .lean();

    // Combine asked and covered questions
    const allCoveredQuestions = new Set<string>(askedQuestionsFromMessages);
    coveredQuestionsFromMeta.forEach((msg: any) => {
      if (msg.meta?.coveredQuestions) {
        msg.meta.coveredQuestions.forEach((q: string) => allCoveredQuestions.add(q));
      }
    });
    const askedQuestions = Array.from(allCoveredQuestions);

    // Filter out questions that have already been asked or covered
    const remainingQuestions = topicQuestions.filter(
      (q: any) => !askedQuestions.includes(q.questionText)
    );
    const nextQuestion = remainingQuestions[0];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:184',message:'Question selection result',data:{currentTopic,topicQuestionsCount:topicQuestions.length,askedQuestionsCount:askedQuestions.length,remainingQuestionsCount:remainingQuestions.length,hasNextQuestion:!!nextQuestion,nextQuestionText:nextQuestion?.questionText?.substring(0,50),recentMessagesCount:recentMessages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // If no messages exist and there's a first question, create opening message
    if (recentMessages.length === 0 && nextQuestion) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:188',message:'Creating opening message',data:{currentTopic,nextQuestionText:nextQuestion.questionText.substring(0,50),hasChallengeId:!!interview.challengeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Build opening message with challenge description
      let openingContent = `שלום ${interview.managerName},\n\n`;
      
      // Add challenge description if challengeId exists
      if (interview.challengeId) {
        const challenge = await Challenge.findById(interview.challengeId).lean();
        if (challenge && challenge.description) {
          openingContent += `האתגר שבו נעסוק הוא: ${challenge.description}\n\n`;
        }
      }
      
      // Add goal explanation
      openingContent += `המטרה שלנו היא לאסוף מידע מפורט על האתגר כדי לבנות מפת אתגר מקיפה. `;
      openingContent += `אני אשאל אותך מספר שאלות, ואתה יכול לענות בפירוט או לדלג על שאלות שאינן רלוונטיות.\n\n`;
      openingContent += `בואו נתחיל:\n\n`;
      
      // Add first question
      openingContent += nextQuestion.questionText;
      
      // Create opening message
      const openingMessage = new ChatMessage({
        interviewId,
        role: 'bot',
        content: openingContent,
        topicNumber: currentTopic,
        questionText: nextQuestion.questionText,
      });
      await openingMessage.save();
      
      // Reload recent messages to include the new one
      const updatedMessages = await ChatMessage.find({
        interviewId,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      recentMessages.length = 0;
      recentMessages.push(...updatedMessages);
    }

    res.json({
      interview: {
        id: interview._id.toString(),
        manager_name: interview.managerName,
        status: interview.status,
        selected_topics: interview.selectedTopics,
      },
      questions: questions.map((q: any) => ({
        topic_number: q.topicNumber,
        question_text: q.questionText,
      })),
      topic_state: topicStates.map((ts: any) => ({
        topic_number: ts.topicNumber,
        confidence: ts.confidence,
        covered_points: ts.coveredPoints,
      })),
      progress: {
        answered,
        skipped,
        total: totalQuestions,
      },
      current: {
        topic_number: currentTopic,
        next_question_text: nextQuestion?.questionText || '',
      },
      recent_messages: recentMessages.reverse().map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/message', async (req: Request, res: Response) => {
  try {
    const { share_token, message, action } = req.body;

    if (!share_token) {
      return res.status(400).json({ error: 'share_token is required' });
    }

    const data = await interviewService.getInterviewByToken(share_token);
    if (!data) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const { interview, questions, topicStates } = data;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:132',message:'Message handler entry',data:{action,message:message?.substring(0,30),selectedTopics:interview.selectedTopics,totalQuestions:questions.length,questionsByTopic:interview.selectedTopics.map((t:number)=>({topic:t,count:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).length}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Update status to in_progress if needed
    if (interview.status === 'not_started') {
      await interviewService.updateInterviewStatus(interview._id.toString(), 'in_progress');
    }

    const interviewId = new mongoose.Types.ObjectId(interview._id);

    // Handle different actions
    if (action === 'skip') {
      // Get current topic state first
      const currentTopicState = topicStates.find((ts: any) => ts.confidence < 0.7) || topicStates[0];
      
      // Find the last question asked by the bot
      const lastBotMessage = await ChatMessage.findOne({
        interviewId,
        role: 'bot',
        questionText: { $exists: true, $ne: null },
      })
        .sort({ createdAt: -1 })
        .lean();

      // Save skip message
      const skipMessage = new ChatMessage({
        interviewId,
        role: 'manager',
        content: message || 'דולג',
      });
      await skipMessage.save();

      // Save Answer with skipped=true for the last question
      if (lastBotMessage && lastBotMessage.questionText) {
        // Check if answer already exists to avoid duplicates
        const existingAnswer = await Answer.findOne({
          interviewId,
          questionText: lastBotMessage.questionText,
        });
        
        if (!existingAnswer) {
          const skippedAnswer = new Answer({
            interviewId,
            topicNumber: lastBotMessage.topicNumber || currentTopicState?.topicNumber || interview.selectedTopics[0],
            questionText: lastBotMessage.questionText,
            skipped: true,
          });
          await skippedAnswer.save();
        }

        // Update session skipped count
        const session = await InterviewSession.findOne({ interviewId });
        if (session) {
          session.skippedCount = (session.skippedCount || 0) + 1;
          await session.save();
        }
      }

      // Get next question (fallback mode)
      const currentTopic = currentTopicState?.topicNumber || interview.selectedTopics[0];
      const topicQuestions = questions.filter(
        (q: any) => q.topicNumber === currentTopic && q.enabled
      );

      // Get all questions that have already been asked (from bot messages)
      const askedQuestionsFromMessages = await ChatMessage.find({
        interviewId,
        role: 'bot',
        questionText: { $exists: true, $ne: null },
      })
        .distinct('questionText')
        .lean();

      // Get all questions marked as covered in previous messages
      const coveredQuestionsFromMeta = await ChatMessage.find({
        interviewId,
        role: 'bot',
        'meta.coveredQuestions': { $exists: true, $ne: [] },
      })
        .select('meta.coveredQuestions')
        .lean();

      // Combine asked and covered questions
      const allCoveredQuestions = new Set<string>(askedQuestionsFromMessages);
      coveredQuestionsFromMeta.forEach((msg: any) => {
        if (msg.meta?.coveredQuestions) {
          msg.meta.coveredQuestions.forEach((q: string) => allCoveredQuestions.add(q));
        }
      });
      const askedQuestions = Array.from(allCoveredQuestions);

      // Filter out questions that have already been asked or covered
      const remainingQuestions = topicQuestions.filter(
        (q: any) => !askedQuestions.includes(q.questionText)
      );
      let nextQuestion = remainingQuestions[0];
      let nextTopic = currentTopic;
      let nextTopicState = currentTopicState;

      // If no questions in current topic, check other topics
      if (!nextQuestion) {
        const nextTopicResult = findNextTopicWithQuestions(
          currentTopic,
          interview.selectedTopics,
          questions,
          askedQuestions
        );
        
        if (nextTopicResult) {
          nextQuestion = nextTopicResult.question;
          nextTopic = nextTopicResult.topic;
          nextTopicState = topicStates.find((ts: any) => ts.topicNumber === nextTopic);
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:195',message:'Skip action - question check',data:{currentTopic,nextTopic,remainingQuestionsCount:remainingQuestions.length,allTopics:interview.selectedTopics,hasNextQuestion:!!nextQuestion,switchedTopic:nextTopic!==currentTopic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (nextQuestion) {
        const botMessage = new ChatMessage({
          interviewId,
          role: 'bot',
          content: nextQuestion.questionText,
          topicNumber: nextTopic,
          questionText: nextQuestion.questionText,
        });
        await botMessage.save();

        // Calculate progress
        const skipAnswers = await Answer.find({ interviewId }).lean();
        // Count unique questions (to avoid counting duplicates)
        const uniqueSkipAnsweredQuestions = new Set(
          skipAnswers.filter((a) => !a.skipped).map((a) => a.questionText)
        );
        const uniqueSkipSkippedQuestions = new Set(
          skipAnswers.filter((a) => a.skipped).map((a) => a.questionText)
        );
        const skipAnswered = uniqueSkipAnsweredQuestions.size;
        const skipSkipped = uniqueSkipSkippedQuestions.size;
        const skipTotalQuestions = questions.filter(
          (q: any) => interview.selectedTopics.includes(q.topicNumber) && q.enabled
        ).length;

        res.json({
          bot_message: nextQuestion.questionText,
          next_action: 'ASK',
          topic_number: nextTopic,
          next_question_text: nextQuestion.questionText,
          quick_replies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
          topic_confidence: nextTopicState?.confidence || 0,
          covered_points: nextTopicState?.coveredPoints || [],
          progress: {
            answered: skipAnswered,
            skipped: skipSkipped,
            total: skipTotalQuestions,
          },
        });
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:220',message:'Skip action - ending interview',data:{currentTopic,allTopics:interview.selectedTopics,questionsByTopic:interview.selectedTopics.map((t:number)=>({topic:t,count:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).length,askedCount:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).filter((q:any)=>askedQuestions.includes(q.questionText)).length})),willEnd:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Calculate progress for end response
        const endAnswers = await Answer.find({ interviewId }).lean();
        // Count unique questions (to avoid counting duplicates)
        const uniqueEndAnsweredQuestions = new Set(
          endAnswers.filter((a) => !a.skipped).map((a) => a.questionText)
        );
        const uniqueEndSkippedQuestions = new Set(
          endAnswers.filter((a) => a.skipped).map((a) => a.questionText)
        );
        const endAnswered = uniqueEndAnsweredQuestions.size;
        const endSkipped = uniqueEndSkippedQuestions.size;
        const endTotalQuestions = questions.filter(
          (q: any) => interview.selectedTopics.includes(q.topicNumber) && q.enabled
        ).length;

        const endResponse = {
          bot_message: 'סיימנו את כל השאלות. תודה!',
          next_action: 'END' as const,
          topic_number: currentTopic,
          quick_replies: [] as string[],
          topic_confidence: 1,
          covered_points: [] as string[],
          progress: {
            answered: endAnswered,
            skipped: endSkipped,
            total: endTotalQuestions,
          },
        };

        // Auto-complete interview when END action is detected
        if (interview.status !== 'completed') {
          try {
            await interviewService.updateInterviewStatus(interview._id.toString(), 'completed');
            // Send email in background (don't block response)
            emailService.sendInterviewSummary(interview._id.toString()).catch((error) => {
              console.error('Failed to send interview summary email:', error);
            });
          } catch (error) {
            console.error('Failed to complete interview:', error);
            // Don't fail the request if completion fails
          }
        }

        res.json(endResponse);
      }
      return;
    }

    // Save manager message
    let managerMessageTimestamp: Date | null = null;
    if (message && action === 'answer') {
      const managerMessage = new ChatMessage({
        interviewId,
        role: 'manager',
        content: message,
      });
      await managerMessage.save();
      managerMessageTimestamp = managerMessage.createdAt;

      // Update session counters
      const session = await InterviewSession.findOne({ interviewId });
      if (session) {
        session.answeredCount += 1;
        await session.save();
      }
    }

    // Get recent messages for LLM context
    const recentMessages = await ChatMessage.find({ interviewId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // Get current topic state
    const currentTopicState = topicStates.find((ts: any) => ts.confidence < 0.7) || topicStates[0];
    const currentTopic = currentTopicState?.topicNumber || interview.selectedTopics[0];
    const topicQuestions = questions.filter((q: any) => q.topicNumber === currentTopic && q.enabled);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:229',message:'Topic selection',data:{selectedTopics:interview.selectedTopics,currentTopic,allTopicStates:topicStates.map((ts:any)=>({topic:ts.topicNumber,confidence:ts.confidence})),topicQuestionsCount:topicQuestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Get all questions that have already been asked (from bot messages)
    const askedQuestionsFromMessages = await ChatMessage.find({
      interviewId,
      role: 'bot',
      questionText: { $exists: true, $ne: null },
    })
      .distinct('questionText')
      .lean();

    // Get all questions marked as covered in previous messages
    const coveredQuestionsFromMeta = await ChatMessage.find({
      interviewId,
      role: 'bot',
      'meta.coveredQuestions': { $exists: true, $ne: [] },
    })
      .select('meta.coveredQuestions')
      .lean();

    // Combine asked and covered questions
    const allCoveredQuestions = new Set<string>(askedQuestionsFromMessages);
    coveredQuestionsFromMeta.forEach((msg: any) => {
      if (msg.meta?.coveredQuestions) {
        msg.meta.coveredQuestions.forEach((q: string) => allCoveredQuestions.add(q));
      }
    });
    const askedQuestions = Array.from(allCoveredQuestions);

    // Filter out questions that have already been asked or covered
    const remainingQuestions = topicQuestions.filter(
      (q: any) => !askedQuestions.includes(q.questionText)
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:245',message:'Questions filtering',data:{askedQuestionsCount:askedQuestions.length,askedQuestions:askedQuestions.slice(0,5),topicQuestionsCount:topicQuestions.length,remainingQuestionsCount:remainingQuestions.length,remainingQuestionTexts:remainingQuestions.map((q:any)=>q.questionText).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Try LLM service
    const llmResponse = await llmService.getNextAction(
      message || '',
      action || 'answer',
      {
        currentTopic,
        remainingQuestions: remainingQuestions.map((q: any) => q.questionText),
        recentMessages: recentMessages.reverse().map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        topicState: currentTopicState
          ? {
              confidence: currentTopicState.confidence,
              coveredPoints: currentTopicState.coveredPoints,
            }
          : undefined,
      }
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:265',message:'LLM response',data:{hasLlmResponse:!!llmResponse,llmNextAction:llmResponse?.next_action,llmTopicNumber:llmResponse?.topic_number,llmBotMessage:llmResponse?.bot_message?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    let response: any;

    if (llmResponse) {
      // If LLM says END, verify there are no more questions in any topic
      if (llmResponse.next_action === 'END') {
        // Check all topics to see if there are any remaining questions
        const nextTopicResult = findNextTopicWithQuestions(
          currentTopic,
          interview.selectedTopics,
          questions,
          askedQuestions
        );
        
        if (nextTopicResult) {
          // LLM was wrong - there are more questions, use fallback
          // But first, save the current answer if exists
          if (message) {
            const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
            if (lastQuestion && lastQuestion.questionText) {
              // Check if answer already exists to avoid duplicates
              const existingAnswer = await Answer.findOne({
                interviewId,
                questionText: lastQuestion.questionText,
              });
              
              if (!existingAnswer) {
                const answer = new Answer({
                  interviewId,
                  topicNumber: lastQuestion.topicNumber || currentTopic,
                  questionText: lastQuestion.questionText,
                  answerText: message,
                  skipped: false,
                });
                await answer.save();
              }
            }
          }
          
          const nextQuestion = nextTopicResult.question;
          const nextTopic = nextTopicResult.topic;
          const nextTopicState = topicStates.find((ts: any) => ts.topicNumber === nextTopic);
          
          response = {
            bot_message: nextQuestion.questionText,
            next_action: 'ASK',
            topic_number: nextTopic,
            next_question_text: nextQuestion.questionText,
            quick_replies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
            topic_confidence: nextTopicState?.confidence || 0,
            covered_points: nextTopicState?.coveredPoints || [],
          };
          
          const botMessage = new ChatMessage({
            interviewId,
            role: 'bot',
            content: nextQuestion.questionText,
            topicNumber: nextTopic,
            questionText: nextQuestion.questionText,
          });
          await botMessage.save();
        } else {
          // LLM was correct - no more questions, respect the END
          // Save the current answer if exists before ending
          if (message) {
            const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
            if (lastQuestion && lastQuestion.questionText) {
              // Check if answer already exists to avoid duplicates
              const existingAnswer = await Answer.findOne({
                interviewId,
                questionText: lastQuestion.questionText,
              });
              
              if (!existingAnswer) {
                const answer = new Answer({
                  interviewId,
                  topicNumber: lastQuestion.topicNumber || currentTopic,
                  questionText: lastQuestion.questionText,
                  answerText: message,
                  skipped: false,
                });
                await answer.save();
              }
            }
          }
          
          response = llmResponse;
          
          const botMessage = new ChatMessage({
            interviewId,
            role: 'bot',
            content: llmResponse.bot_message,
            topicNumber: llmResponse.topic_number,
            questionText: llmResponse.next_question_text,
            meta: {
              action: llmResponse.next_action,
              topicConfidence: llmResponse.topic_confidence,
              coveredQuestions: llmResponse.mark_questions_covered,
            },
          });
          await botMessage.save();
          
          // Update topic state
          if (currentTopicState) {
            const topicStateDoc = await TopicState.findOne({
              interviewId,
              topicNumber: currentTopicState.topicNumber,
            });
            if (topicStateDoc) {
              topicStateDoc.confidence = llmResponse.topic_confidence;
              if (llmResponse.covered_points.length > 0) {
                // Filter out questions from covered_points
                const filteredCoveredPoints = filterQuestionsFromCoveredPoints(llmResponse.covered_points);
                if (filteredCoveredPoints.length > 0) {
                  topicStateDoc.coveredPoints = [
                    ...new Set([...currentTopicState.coveredPoints, ...filteredCoveredPoints]),
                  ];
                }
              }
              await topicStateDoc.save();
            }
          }
        }
      } else {
        // Use LLM response (ASK, FOLLOW_UP, TOPIC_WRAP)
        // Handle FOLLOW_UP: check if follow-up already asked for last question
        if (llmResponse.next_action === 'FOLLOW_UP') {
          // Find the last original question (not a follow-up)
          const lastOriginalQuestion = await ChatMessage.findOne({
            interviewId,
            role: 'bot',
            questionText: { $exists: true, $ne: null },
            isFollowUp: { $ne: true },
          })
            .sort({ createdAt: -1 })
            .lean();

          if (lastOriginalQuestion && lastOriginalQuestion.questionText) {
            // Check if a follow-up was already asked for this question
            const existingFollowUp = await ChatMessage.findOne({
              interviewId,
              role: 'bot',
              isFollowUp: true,
              originalQuestionText: lastOriginalQuestion.questionText,
            }).lean();

            if (existingFollowUp) {
              // Follow-up already asked, move to next question instead
              let nextQuestion = remainingQuestions[0];
              let nextTopic = currentTopic;
              let nextTopicState = currentTopicState;

              // If no questions in current topic, check other topics
              if (!nextQuestion) {
                const nextTopicResult = findNextTopicWithQuestions(
                  currentTopic,
                  interview.selectedTopics,
                  questions,
                  askedQuestions
                );
                
                if (nextTopicResult) {
                  nextQuestion = nextTopicResult.question;
                  nextTopic = nextTopicResult.topic;
                  nextTopicState = topicStates.find((ts: any) => ts.topicNumber === nextTopic);
                }
              }

              if (nextQuestion) {
                response = {
                  bot_message: nextQuestion.questionText,
                  next_action: 'ASK',
                  topic_number: nextTopic,
                  next_question_text: nextQuestion.questionText,
                  quick_replies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
                  topic_confidence: nextTopicState?.confidence || 0,
                  covered_points: nextTopicState?.coveredPoints || [],
                };

                // IMPORTANT: Save answer BEFORE saving the next bot message
                // This ensures we find the correct question that was answered
                if (message && lastOriginalQuestion.questionText) {
                  // Check if answer already exists to avoid duplicates
                  const existingAnswer = await Answer.findOne({
                    interviewId,
                    questionText: lastOriginalQuestion.questionText,
                  });
                  
                  if (!existingAnswer) {
                    const answer = new Answer({
                      interviewId,
                      topicNumber: lastOriginalQuestion.topicNumber || currentTopic,
                      questionText: lastOriginalQuestion.questionText,
                      answerText: message,
                      skipped: false,
                    });
                    await answer.save();
                  }
                }
                
                const botMessage = new ChatMessage({
                  interviewId,
                  role: 'bot',
                  content: nextQuestion.questionText,
                  topicNumber: nextTopic,
                  questionText: nextQuestion.questionText,
                });
                await botMessage.save();
              } else {
                // No more questions, use END
                response = {
                  bot_message: 'סיימנו את כל השאלות. תודה!',
                  next_action: 'END',
                  topic_number: currentTopic,
                  quick_replies: [],
                  topic_confidence: 1,
                  covered_points: [],
                };
              }
            } else {
              // No follow-up yet, allow this follow-up
              
              // IMPORTANT: Save answer BEFORE saving the follow-up bot message
              // This ensures we find the correct question that was answered
              if (message) {
                const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
                if (lastQuestion && lastQuestion.questionText) {
                  // Check if answer already exists to avoid duplicates
                  const existingAnswer = await Answer.findOne({
                    interviewId,
                    questionText: lastQuestion.questionText,
                  });
                  
                  if (!existingAnswer) {
                    const answer = new Answer({
                      interviewId,
                      topicNumber: lastQuestion.topicNumber || currentTopic,
                      questionText: lastQuestion.questionText,
                      answerText: message,
                      skipped: false,
                    });
                    await answer.save();
                  }
                }
              }
              
              response = llmResponse;

              // Save bot message as follow-up
              const botMessage = new ChatMessage({
                interviewId,
                role: 'bot',
                content: llmResponse.bot_message,
                topicNumber: llmResponse.topic_number,
                questionText: llmResponse.next_question_text,
                isFollowUp: true,
                originalQuestionText: lastOriginalQuestion.questionText,
                meta: {
                  action: llmResponse.next_action,
                  topicConfidence: llmResponse.topic_confidence,
                  coveredQuestions: llmResponse.mark_questions_covered,
                },
              });
              await botMessage.save();

              // Update topic state
              if (currentTopicState) {
                const topicStateDoc = await TopicState.findOne({
                  interviewId,
                  topicNumber: currentTopicState.topicNumber,
                });
                if (topicStateDoc) {
                  topicStateDoc.confidence = llmResponse.topic_confidence;
                  if (llmResponse.covered_points.length > 0) {
                    // Filter out questions from covered_points
                    const filteredCoveredPoints = filterQuestionsFromCoveredPoints(llmResponse.covered_points);
                    if (filteredCoveredPoints.length > 0) {
                      topicStateDoc.coveredPoints = [
                        ...new Set([...currentTopicState.coveredPoints, ...filteredCoveredPoints]),
                      ];
                    }
                  }
                  await topicStateDoc.save();
                }
              }
            }
          } else {
            // No original question found, treat as regular question
            
            // IMPORTANT: Save answer BEFORE saving the next bot message
            // This ensures we find the correct question that was answered
            if (message) {
              const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
              if (lastQuestion && lastQuestion.questionText) {
                // Check if answer already exists to avoid duplicates
                const existingAnswer = await Answer.findOne({
                  interviewId,
                  questionText: lastQuestion.questionText,
                });
                
                if (!existingAnswer) {
                  const answer = new Answer({
                    interviewId,
                    topicNumber: lastQuestion.topicNumber || currentTopic,
                    questionText: lastQuestion.questionText,
                    answerText: message,
                    skipped: false,
                  });
                  await answer.save();
                }
              }
            }
            
            response = llmResponse;

            const botMessage = new ChatMessage({
              interviewId,
              role: 'bot',
              content: llmResponse.bot_message,
              topicNumber: llmResponse.topic_number,
              questionText: llmResponse.next_question_text,
              meta: {
                action: llmResponse.next_action,
                topicConfidence: llmResponse.topic_confidence,
                coveredQuestions: llmResponse.mark_questions_covered,
              },
            });
            await botMessage.save();

            // Update topic state
            if (currentTopicState) {
              const topicStateDoc = await TopicState.findOne({
                interviewId,
                topicNumber: currentTopicState.topicNumber,
              });
              if (topicStateDoc) {
                topicStateDoc.confidence = llmResponse.topic_confidence;
                if (llmResponse.covered_points.length > 0) {
                  // Filter out questions from covered_points
                  const filteredCoveredPoints = filterQuestionsFromCoveredPoints(llmResponse.covered_points);
                  if (filteredCoveredPoints.length > 0) {
                    topicStateDoc.coveredPoints = [
                      ...new Set([...currentTopicState.coveredPoints, ...filteredCoveredPoints]),
                    ];
                  }
                }
                await topicStateDoc.save();
              }
            }
          }
        } else {
          // Not a FOLLOW_UP, use LLM response as-is
          
          // IMPORTANT: Save answer BEFORE saving the next bot message
          // This ensures we find the correct question that was answered
          if (message) {
            const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
            if (lastQuestion && lastQuestion.questionText) {
              // Check if answer already exists to avoid duplicates
              const existingAnswer = await Answer.findOne({
                interviewId,
                questionText: lastQuestion.questionText,
              });
              
              if (!existingAnswer) {
                const answer = new Answer({
                  interviewId,
                  topicNumber: lastQuestion.topicNumber || currentTopic,
                  questionText: lastQuestion.questionText,
                  answerText: message,
                  skipped: false,
                });
                await answer.save();
              }
            }
          }
          
          response = llmResponse;

          // Save bot message
          const botMessage = new ChatMessage({
            interviewId,
            role: 'bot',
            content: llmResponse.bot_message,
            topicNumber: llmResponse.topic_number,
            questionText: llmResponse.next_question_text,
            meta: {
              action: llmResponse.next_action,
              topicConfidence: llmResponse.topic_confidence,
              coveredQuestions: llmResponse.mark_questions_covered,
            },
          });
          await botMessage.save();

            // Update topic state
            if (currentTopicState) {
              const topicStateDoc = await TopicState.findOne({
                interviewId,
                topicNumber: currentTopicState.topicNumber,
              });
              if (topicStateDoc) {
                topicStateDoc.confidence = llmResponse.topic_confidence;
                if (llmResponse.covered_points.length > 0) {
                  // Filter out questions from covered_points
                  const filteredCoveredPoints = filterQuestionsFromCoveredPoints(llmResponse.covered_points);
                  if (filteredCoveredPoints.length > 0) {
                    topicStateDoc.coveredPoints = [
                      ...new Set([...currentTopicState.coveredPoints, ...filteredCoveredPoints]),
                    ];
                  }
                }
                await topicStateDoc.save();
              }
            }
          }
        }
      } else {
        // Fallback: use static questions (only those not already asked)
      let nextQuestion = remainingQuestions[0];
      let nextTopic = currentTopic;
      let nextTopicState = currentTopicState;

      // If no questions in current topic, check other topics
      if (!nextQuestion) {
        const nextTopicResult = findNextTopicWithQuestions(
          currentTopic,
          interview.selectedTopics,
          questions,
          askedQuestions
        );
        
        if (nextTopicResult) {
          nextQuestion = nextTopicResult.question;
          nextTopic = nextTopicResult.topic;
          nextTopicState = topicStates.find((ts: any) => ts.topicNumber === nextTopic);
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:378',message:'Before fallback decision',data:{hasNextQuestion:!!nextQuestion,currentTopic,nextTopic,remainingQuestionsCount:remainingQuestions.length,allTopics:interview.selectedTopics,switchedTopic:nextTopic!==currentTopic,questionsByTopic:interview.selectedTopics.map((t:number)=>({topic:t,count:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).length,askedCount:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).filter((q:any)=>askedQuestions.includes(q.questionText)).length})),topicStates:topicStates.map((ts:any)=>({topic:ts.topicNumber,confidence:ts.confidence}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (nextQuestion) {
        response = {
          bot_message: nextQuestion.questionText,
          next_action: 'ASK',
          topic_number: nextTopic,
          next_question_text: nextQuestion.questionText,
          quick_replies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
          topic_confidence: nextTopicState?.confidence || 0,
          covered_points: nextTopicState?.coveredPoints || [],
        };

        // IMPORTANT: Save answer BEFORE saving the next bot message
        // This ensures we find the correct question that was answered
        if (message) {
          const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
          if (lastQuestion && lastQuestion.questionText) {
            // Check if answer already exists to avoid duplicates
            const existingAnswer = await Answer.findOne({
              interviewId,
              questionText: lastQuestion.questionText,
            });
            
            if (!existingAnswer) {
              const answer = new Answer({
                interviewId,
                topicNumber: lastQuestion.topicNumber || nextTopic,
                questionText: lastQuestion.questionText,
                answerText: message,
                skipped: false,
              });
              await answer.save();
            }
          }
        }
        
        const botMessage = new ChatMessage({
          interviewId,
          role: 'bot',
          content: nextQuestion.questionText,
          topicNumber: nextTopic,
          questionText: nextQuestion.questionText,
        });
        await botMessage.save();

        // Update confidence in fallback mode based on number of answers
        if (nextTopicState) {
          const topicStateDoc = await TopicState.findOne({
            interviewId,
            topicNumber: nextTopic,
          });
          if (topicStateDoc) {
            // Count answered questions for this topic
            const topicAnswers = await Answer.find({
              interviewId,
              topicNumber: nextTopic,
              skipped: false,
            }).lean();
            
            // Count total questions for this topic
            const topicQuestionsCount = questions.filter(
              (q: any) => q.topicNumber === nextTopic && q.enabled
            ).length;
            
            // Calculate confidence: min(0.9, answered / total * 1.2)
            // This gives up to 90% confidence when most questions are answered
            const answeredCount = topicAnswers.length;
            const newConfidence = Math.min(0.9, (answeredCount / Math.max(1, topicQuestionsCount)) * 1.2);
            
            // Only update if confidence increased
            if (newConfidence > topicStateDoc.confidence) {
              topicStateDoc.confidence = newConfidence;
              await topicStateDoc.save();
              
              // Update nextTopicState for response
              nextTopicState.confidence = newConfidence;
              response.topic_confidence = newConfidence;
            }
          }
        }
      } else {
        // No more questions - save the last answer before ending
        if (message) {
          const lastQuestion = await findLastQuestionBefore(interviewId, managerMessageTimestamp);
          if (lastQuestion && lastQuestion.questionText) {
            // Check if answer already exists to avoid duplicates
            const existingAnswer = await Answer.findOne({
              interviewId,
              questionText: lastQuestion.questionText,
            });
            
            if (!existingAnswer) {
              const answer = new Answer({
                interviewId,
                topicNumber: lastQuestion.topicNumber || currentTopic,
                questionText: lastQuestion.questionText,
                answerText: message,
                skipped: false,
              });
              await answer.save();
            }
          }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:409',message:'No questions in any topic - ending interview',data:{currentTopic,allTopics:interview.selectedTopics,questionsByTopic:interview.selectedTopics.map((t:number)=>({topic:t,totalQuestions:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).length,askedQuestions:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).filter((q:any)=>askedQuestions.includes(q.questionText)).length,remainingQuestions:questions.filter((q:any)=>q.topicNumber===t&&q.enabled).filter((q:any)=>!askedQuestions.includes(q.questionText)).length})),willEnd:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        response = {
          bot_message: 'סיימנו את כל השאלות. תודה!',
          next_action: 'END',
          topic_number: currentTopic,
          quick_replies: [],
          topic_confidence: 1,
          covered_points: [],
        };
      }
    }

    // Calculate progress for response
    const answers = await Answer.find({ interviewId }).lean();
    
    // Update confidence for all topics in fallback mode (to catch up on any missed updates)
    if (!llmResponse) {
      for (const topicState of topicStates) {
        const topicAnswers = answers.filter(
          (a: any) => a.topicNumber === topicState.topicNumber && !a.skipped
        );
        const topicQuestionsCount = questions.filter(
          (q: any) => q.topicNumber === topicState.topicNumber && q.enabled
        ).length;
        
        if (topicQuestionsCount > 0) {
          const newConfidence = Math.min(0.9, (topicAnswers.length / topicQuestionsCount) * 1.2);
          const topicStateDoc = await TopicState.findOne({
            interviewId,
            topicNumber: topicState.topicNumber,
          });
          if (topicStateDoc && newConfidence > topicStateDoc.confidence) {
            topicStateDoc.confidence = newConfidence;
            await topicStateDoc.save();
          }
        }
      }
    }

    // Calculate progress for response
    // Create set of valid question texts from questions array
    const questionTexts = new Set(
      questions
        .filter((q: any) => interview.selectedTopics.includes(q.topicNumber) && q.enabled)
        .map((q: any) => q.questionText)
    );
    // Count unique questions (only count answers for questions that exist in questions array)
    const uniqueAnsweredQuestions = new Set(
      answers
        .filter((a) => !a.skipped && questionTexts.has(a.questionText))
        .map((a) => a.questionText)
    );
    const uniqueSkippedQuestions = new Set(
      answers
        .filter((a) => a.skipped && questionTexts.has(a.questionText))
        .map((a) => a.questionText)
    );
    const answered = uniqueAnsweredQuestions.size;
    const skipped = uniqueSkippedQuestions.size;
    const totalQuestions = questions.filter(
      (q: any) => interview.selectedTopics.includes(q.topicNumber) && q.enabled
    ).length;

    // Add progress to response
    response.progress = {
      answered,
      skipped,
      total: totalQuestions,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manager.ts:361',message:'Final response',data:{nextAction:response.next_action,topicNumber:response.topic_number,hasBotMessage:!!response.bot_message,botMessagePreview:response.bot_message?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Auto-complete interview when END action is detected
    if (response.next_action === 'END' && interview.status !== 'completed') {
      try {
        await interviewService.updateInterviewStatus(interview._id.toString(), 'completed');
        // Send email in background (don't block response)
        emailService.sendInterviewSummary(interview._id.toString()).catch((error) => {
          console.error('Failed to send interview summary email:', error);
        });
      } catch (error) {
        console.error('Failed to complete interview:', error);
        // Don't fail the request if completion fails
      }
    }

    res.json(response);
  } catch (error: any) {
    console.error('Manager message error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { share_token } = req.body;

    if (!share_token) {
      return res.status(400).json({ error: 'share_token is required' });
    }

    const data = await interviewService.getInterviewByToken(share_token);
    if (!data) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    await interviewService.updateInterviewStatus(data.interview._id.toString(), 'completed');

    // Send email in background (don't block response)
    emailService.sendInterviewSummary(data.interview._id.toString()).catch((error) => {
      console.error('Failed to send interview summary email:', error);
    });

    res.json({ ok: true, interview_id: data.interview._id.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

