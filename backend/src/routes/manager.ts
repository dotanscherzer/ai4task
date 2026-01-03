import express, { Request, Response } from 'express';
import { interviewService } from '../services/interviewService';
import { ChatMessage } from '../models/ChatMessage';
import { Answer } from '../models/Answer';
import { TopicState } from '../models/TopicState';
import { InterviewSession } from '../models/InterviewSession';
import { llmService } from '../services/llmService';
import mongoose from 'mongoose';

const router = express.Router();

router.post('/state', async (req: Request, res: Response) => {
  try {
    const { share_token } = req.body;

    if (!share_token) {
      return res.status(400).json({ error: 'share_token is required' });
    }

    const data = await interviewService.getInterviewByToken(share_token);
    if (!data) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const { interview, questions, topicStates, session } = data;

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
    const answered = answers.filter((a) => !a.skipped).length;
    const skipped = answers.filter((a) => a.skipped).length;

    // Determine current topic and next question
    const currentTopicState = topicStates.find((ts: any) => ts.confidence < 0.7) || topicStates[0];
    const currentTopic = currentTopicState?.topicNumber || interview.selectedTopics[0];
    const topicQuestions = questions.filter((q: any) => q.topicNumber === currentTopic && q.enabled);
    const nextQuestion = topicQuestions[0];

    // If no messages exist and there's a first question, create a bot message for it
    if (recentMessages.length === 0 && nextQuestion) {
      const firstBotMessage = new ChatMessage({
        interviewId,
        role: 'bot',
        content: nextQuestion.questionText,
        topicNumber: currentTopic,
        questionText: nextQuestion.questionText,
      });
      await firstBotMessage.save();
      
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

    // Update status to in_progress if needed
    if (interview.status === 'not_started') {
      await interviewService.updateInterviewStatus(interview._id.toString(), 'in_progress');
    }

    const interviewId = new mongoose.Types.ObjectId(interview._id);

    // Handle different actions
    if (action === 'skip') {
      // Save skip message
      const skipMessage = new ChatMessage({
        interviewId,
        role: 'manager',
        content: message || 'דולג',
      });
      await skipMessage.save();

      // Get next question (fallback mode)
      const currentTopicState = topicStates.find((ts: any) => ts.confidence < 0.7) || topicStates[0];
      const currentTopic = currentTopicState?.topicNumber || interview.selectedTopics[0];
      const topicQuestions = questions.filter(
        (q: any) => q.topicNumber === currentTopic && q.enabled
      );
      const nextQuestion = topicQuestions[0];

      if (nextQuestion) {
        const botMessage = new ChatMessage({
          interviewId,
          role: 'bot',
          content: nextQuestion.questionText,
          topicNumber: currentTopic,
          questionText: nextQuestion.questionText,
        });
        await botMessage.save();

        res.json({
          bot_message: nextQuestion.questionText,
          next_action: 'ASK',
          topic_number: currentTopic,
          next_question_text: nextQuestion.questionText,
          quick_replies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
          topic_confidence: currentTopicState?.confidence || 0,
          covered_points: currentTopicState?.coveredPoints || [],
        });
      } else {
        res.json({
          bot_message: 'סיימנו את כל השאלות. תודה!',
          next_action: 'END',
          topic_number: currentTopic,
          quick_replies: [],
          topic_confidence: 1,
          covered_points: [],
        });
      }
      return;
    }

    // Save manager message
    if (message && action === 'answer') {
      const managerMessage = new ChatMessage({
        interviewId,
        role: 'manager',
        content: message,
      });
      await managerMessage.save();

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

    // Try LLM service
    const llmResponse = await llmService.getNextAction(
      message || '',
      action || 'answer',
      {
        currentTopic,
        remainingQuestions: topicQuestions.map((q: any) => q.questionText),
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

    let response: any;

    if (llmResponse) {
      // Use LLM response
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
            topicStateDoc.coveredPoints = [
              ...new Set([...currentTopicState.coveredPoints, ...llmResponse.covered_points]),
            ];
          }
          await topicStateDoc.save();
        }
      }

      // Save answer if provided
      if (message && llmResponse.next_question_text) {
        const answer = new Answer({
          interviewId,
          topicNumber: currentTopic,
          questionText: llmResponse.next_question_text,
          answerText: message,
          skipped: false,
        });
        await answer.save();
      }
    } else {
      // Fallback: use static questions
      const nextQuestion = topicQuestions[0];
      if (nextQuestion) {
        response = {
          bot_message: nextQuestion.questionText,
          next_action: 'ASK',
          topic_number: currentTopic,
          next_question_text: nextQuestion.questionText,
          quick_replies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
          topic_confidence: currentTopicState?.confidence || 0,
          covered_points: currentTopicState?.coveredPoints || [],
        };

        const botMessage = new ChatMessage({
          interviewId,
          role: 'bot',
          content: nextQuestion.questionText,
          topicNumber: currentTopic,
          questionText: nextQuestion.questionText,
        });
        await botMessage.save();

        if (message) {
          const answer = new Answer({
            interviewId,
            topicNumber: currentTopic,
            questionText: nextQuestion.questionText,
            answerText: message,
            skipped: false,
          });
          await answer.save();
        }
      } else {
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

    res.json({ ok: true, interview_id: data.interview._id.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

