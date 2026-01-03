import { v4 as uuidv4 } from 'uuid';
import { Interview } from '../models/Interview';
import { Question } from '../models/Question';
import { InterviewQuestion } from '../models/InterviewQuestion';
import { InterviewSession } from '../models/InterviewSession';
import { TopicState } from '../models/TopicState';
import { Answer } from '../models/Answer';
import { ChatMessage } from '../models/ChatMessage';
import { challengeService } from './challengeService';
import mongoose from 'mongoose';

export class InterviewService {
  async createInterview(data: {
    adminUserId?: string;
    adminEmail: string;
    managerName: string;
    managerRole?: string;
    selectedTopics: number[];
    questionIds?: string[];
    challengeId?: string;
  }): Promise<any> {
    // Validate that topics belong to challenge if challengeId is provided
    if (data.challengeId) {
      const isValid = await challengeService.validateTopicsBelongToChallenge(
        data.challengeId,
        data.selectedTopics
      );
      if (!isValid) {
        throw new Error('Selected topics must belong to the specified challenge');
      }
    }

    const shareToken = uuidv4();

    const interview = new Interview({
      ...data,
      challengeId: data.challengeId ? new mongoose.Types.ObjectId(data.challengeId) : undefined,
      shareToken,
      status: 'not_started',
    });

    await interview.save();

    // Create interview session
    const session = new InterviewSession({
      interviewId: interview._id,
      answeredCount: 0,
      skippedCount: 0,
    });
    await session.save();

    // Create interview questions
    let questions;
    if (data.questionIds && data.questionIds.length > 0) {
      questions = await Question.find({ _id: { $in: data.questionIds } });
    } else {
      // Use default questions for selected topics
      questions = await Question.find({
        topicNumber: { $in: data.selectedTopics },
        isDefault: true,
      });
    }

    const interviewQuestions = questions.map((q, index) => ({
      interviewId: interview._id,
      questionId: q._id,
      enabled: true,
      sortOrder: index + 1,
    }));

    await InterviewQuestion.insertMany(interviewQuestions);

    // Initialize topic states
    const topicStates = data.selectedTopics.map((topicNumber) => ({
      interviewId: interview._id,
      topicNumber,
      confidence: 0,
      coveredPoints: [],
    }));

    await TopicState.insertMany(topicStates);

    return interview.toObject();
  }

  async getInterviewByToken(shareToken: string): Promise<any> {
    const interview = await Interview.findOne({ shareToken });
    if (!interview) {
      return null;
    }

    const [questions, topicStates, session] = await Promise.all([
      InterviewQuestion.find({ interviewId: interview._id })
        .populate('questionId')
        .sort({ sortOrder: 1 })
        .lean(),
      TopicState.find({ interviewId: interview._id }).lean(),
      InterviewSession.findOne({ interviewId: interview._id }).lean(),
    ]);

    return {
      interview: interview.toObject(),
      questions: questions.map((iq: any) => ({
        id: iq.questionId._id,
        topicNumber: iq.questionId.topicNumber,
        questionText: iq.questionId.questionText,
        enabled: iq.enabled,
        sortOrder: iq.sortOrder,
      })),
      topicStates,
      session,
    };
  }

  async getInterviewById(interviewId: string, adminUserId?: string): Promise<any> {
    const query: any = { _id: interviewId };
    if (adminUserId) {
      query.adminUserId = adminUserId;
    }

    const interview = await Interview.findOne(query).populate('challengeId', 'name description');
    if (!interview) {
      return null;
    }

    return interview.toObject();
  }

  async listInterviews(adminUserId?: string): Promise<any[]> {
    const query: any = {};
    if (adminUserId) {
      query.adminUserId = adminUserId;
    }

    const interviews = await Interview.find(query)
      .populate('challengeId', 'name description')
      .sort({ createdAt: -1 })
      .lean();
    return interviews;
  }

  async updateInterviewStatus(
    interviewId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<void> {
    await Interview.findByIdAndUpdate(interviewId, { status });

    if (status === 'in_progress') {
      const session = await InterviewSession.findOne({ interviewId });
      if (session && !session.startedAt) {
        session.startedAt = new Date();
        await session.save();
      }
    } else if (status === 'completed') {
      const session = await InterviewSession.findOne({ interviewId });
      if (session && !session.completedAt) {
        session.completedAt = new Date();
        await session.save();
      }
    }
  }

  async deleteInterview(interviewId: string, adminUserId?: string): Promise<boolean> {
    const query: any = { _id: interviewId };
    if (adminUserId) {
      query.adminUserId = adminUserId;
    }

    const interview = await Interview.findOne(query);
    if (!interview) {
      return false;
    }

    const interviewObjectId = new mongoose.Types.ObjectId(interviewId);

    // Delete all related data
    await Promise.all([
      InterviewQuestion.deleteMany({ interviewId: interviewObjectId }),
      InterviewSession.deleteMany({ interviewId: interviewObjectId }),
      TopicState.deleteMany({ interviewId: interviewObjectId }),
      Answer.deleteMany({ interviewId: interviewObjectId }),
      ChatMessage.deleteMany({ interviewId: interviewObjectId }),
    ]);

    // Delete the interview itself
    await Interview.findByIdAndDelete(interviewId);

    return true;
  }
}

export const interviewService = new InterviewService();

