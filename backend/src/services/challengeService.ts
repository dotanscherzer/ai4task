import { Challenge } from '../models/Challenge';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { llmService } from './llmService';
import mongoose from 'mongoose';

export class ChallengeService {
  async createChallenge(data: {
    name: string;
    description: string;
    topicNumbers: number[];
    createdBy?: string;
  }): Promise<any> {
    const challenge = new Challenge({
      ...data,
    });

    await challenge.save();
    const challengeId = challenge._id;

    console.log(`\n🔍 Starting question generation for challenge: ${data.name} (${challengeId})`);

    // Generate questions for each topic
    try {
      // First, verify Topics exist in DB
      const allTopicsCount = await Topic.countDocuments();
      console.log(`📊 Topics in DB: ${allTopicsCount}`);
      if (allTopicsCount === 0) {
        console.error('❌ No Topics found in database. Please run seed script first: npm run seed');
        throw new Error('Topics not found in database. Please run seed script first.');
      }

      // Fetch topics from DB
      console.log(`🔍 Looking for topics: ${data.topicNumbers.join(', ')}`);
      const topics = await Topic.find({ number: { $in: data.topicNumbers } });
      console.log(`✅ Found ${topics.length} topics in DB`);
      
      if (topics.length === 0) {
        console.error(`❌ No topics found for numbers: ${data.topicNumbers.join(', ')}`);
        throw new Error(`No topics found in database for the selected topic numbers. Please run seed script first.`);
      }

      if (topics.length !== data.topicNumbers.length) {
        const foundNumbers = topics.map((t) => t.number);
        const missingNumbers = data.topicNumbers.filter((n) => !foundNumbers.includes(n));
        console.warn(`⚠️ Some topics not found in DB: ${missingNumbers.join(', ')}`);
      }

      // Check if LLM API key is configured
      const apiKey = process.env.OPENROUTER_API_KEY;
      const hasLLMKey = !!apiKey;
      console.log(`🔑 OPENROUTER_API_KEY status: ${hasLLMKey ? 'SET' : 'NOT SET'}${hasLLMKey ? ` (length: ${apiKey?.length || 0})` : ''}`);
      
      if (!hasLLMKey) {
        console.warn('⚠️ OPENROUTER_API_KEY not set. Questions will not be generated automatically.');
        console.warn('⚠️ Challenge created successfully, but no questions were generated.');
        // Continue - challenge is created, but without questions
      }

      // Generate questions for each topic
      let totalQuestionsCreated = 0;
      let failedTopics = 0;
      
      console.log(`\n🚀 Starting question generation for ${topics.length} topics...\n`);
      
      for (const topic of topics) {
        try {
          console.log(`📝 Generating questions for topic ${topic.number}: ${topic.label}`);
          console.log(`   Challenge: ${data.name}`);
          console.log(`   Topic description: ${topic.description.substring(0, 100)}...`);
          
          const questions = await llmService.generateQuestionsForChallenge(
            data.name,
            data.description,
            {
              number: topic.number,
              label: topic.label,
              description: topic.description,
            }
          );

          console.log(`   📊 LLM returned ${questions.length} questions for topic ${topic.number}`);

          if (questions.length > 0) {
            // Create Question objects for this topic
            const questionDocs = questions.map((questionText) => ({
              topicNumber: topic.number,
              questionText,
              challengeId: challengeId,
              isDefault: false,
            }));

            await Question.insertMany(questionDocs);
            totalQuestionsCreated += questions.length;
            console.log(`   ✅ Successfully saved ${questions.length} questions for topic ${topic.number}`);
          } else {
            console.warn(`   ⚠️ No questions generated for topic ${topic.number} (LLM returned empty array)`);
            failedTopics++;
          }
        } catch (error: any) {
          console.error(`   ❌ Error generating questions for topic ${topic.number}:`);
          console.error(`      Error message: ${error.message || error}`);
          console.error(`      Error stack: ${error.stack?.substring(0, 200)}...`);
          failedTopics++;
          // Continue with other topics even if one fails
        }
        console.log(''); // Empty line for readability
      }

      // Summary
      console.log('='.repeat(60));
      if (totalQuestionsCreated > 0) {
        console.log(`✅ Successfully created ${totalQuestionsCreated} questions for challenge ${challengeId}`);
        console.log(`   Topics processed: ${topics.length}`);
        console.log(`   Topics with questions: ${topics.length - failedTopics}`);
        console.log(`   Topics failed: ${failedTopics}`);
      } else {
        console.warn(`⚠️ No questions were created for challenge ${challengeId}`);
        console.warn(`   Topics processed: ${topics.length}`);
        console.warn(`   Failed topics: ${failedTopics}`);
        if (!hasLLMKey) {
          console.warn(`   Reason: OPENROUTER_API_KEY is not set`);
        } else {
          console.warn(`   Reason: LLM did not return any questions (check LLM service logs for details)`);
        }
      }
      console.log('='.repeat(60) + '\n');
    } catch (error: any) {
      console.error('❌ Error generating questions for challenge:');
      console.error(`   Challenge ID: ${challengeId}`);
      console.error(`   Error message: ${error.message || error}`);
      console.error(`   Error stack: ${error.stack?.substring(0, 300)}...`);
      
      // If it's a Topics error, throw it up (challenge creation should fail)
      if (error.message?.includes('Topics not found') || error.message?.includes('No topics found')) {
        throw error;
      }
      // Otherwise, continue even if question generation fails - challenge is already created
    }

    return challenge.toObject();
  }

  async getChallengeById(challengeId: string): Promise<any> {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return null;
    }
    return challenge.toObject();
  }

  async listChallenges(): Promise<any[]> {
    const challenges = await Challenge.find().sort({ createdAt: -1 }).lean();
    return challenges;
  }

  async updateChallenge(challengeId: string, data: {
    name?: string;
    description?: string;
    topicNumbers?: number[];
  }): Promise<any> {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return null;
    }

    const oldTopicNumbers = challenge.topicNumbers;
    const newTopicNumbers = data.topicNumbers || oldTopicNumbers;

    // Update challenge
    const updatedChallenge = await Challenge.findByIdAndUpdate(
      challengeId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!updatedChallenge) {
      return null;
    }

    // If topicNumbers changed, update questions
    if (data.topicNumbers && JSON.stringify(oldTopicNumbers.sort()) !== JSON.stringify(newTopicNumbers.sort())) {
      try {
        // Delete questions for removed topics
        const removedTopics = oldTopicNumbers.filter((n) => !newTopicNumbers.includes(n));
        if (removedTopics.length > 0) {
          await Question.deleteMany({
            challengeId: new mongoose.Types.ObjectId(challengeId),
            topicNumber: { $in: removedTopics },
          });
          console.log(`✅ Deleted questions for removed topics: ${removedTopics.join(', ')}`);
        }

        // Generate questions for new topics
        const addedTopics = newTopicNumbers.filter((n) => !oldTopicNumbers.includes(n));
        if (addedTopics.length > 0) {
          const topics = await Topic.find({ number: { $in: addedTopics } });
          
          if (topics.length !== addedTopics.length) {
            const foundNumbers = topics.map((t) => t.number);
            const missingNumbers = addedTopics.filter((n) => !foundNumbers.includes(n));
            console.warn(`⚠️ Some topics not found in DB: ${missingNumbers.join(', ')}`);
          }

          for (const topic of topics) {
            try {
              const questions = await llmService.generateQuestionsForChallenge(
                updatedChallenge.name,
                updatedChallenge.description,
                {
                  number: topic.number,
                  label: topic.label,
                  description: topic.description,
                }
              );

              if (questions.length > 0) {
                const questionDocs = questions.map((questionText) => ({
                  topicNumber: topic.number,
                  questionText,
                  challengeId: new mongoose.Types.ObjectId(challengeId),
                  isDefault: false,
                }));

                await Question.insertMany(questionDocs);
                console.log(`✅ Generated ${questions.length} questions for new topic ${topic.number}`);
              } else {
                console.warn(`⚠️ No questions generated for topic ${topic.number}`);
              }
            } catch (error) {
              console.error(`❌ Error generating questions for topic ${topic.number}:`, error);
              // Continue with other topics even if one fails
            }
          }
        }
      } catch (error) {
        console.error('❌ Error updating questions for challenge:', error);
        // Continue even if question generation fails - challenge is already updated
      }
    }

    return updatedChallenge.toObject();
  }

  async deleteChallenge(challengeId: string): Promise<boolean> {
    const result = await Challenge.findByIdAndDelete(challengeId);
    return !!result;
  }

  async getChallengeByTopicNumber(topicNumber: number): Promise<any> {
    const challenge = await Challenge.findOne({
      topicNumbers: topicNumber,
    }).lean();

    return challenge;
  }

  async validateTopicsBelongToChallenge(
    challengeId: string,
    topicNumbers: number[]
  ): Promise<boolean> {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return false;
    }

    // Check if all topicNumbers are in the challenge's topicNumbers
    return topicNumbers.every((topicNum) => challenge.topicNumbers.includes(topicNum));
  }

  async getChallengeQuestions(challengeId: string): Promise<any[]> {
    const questions = await Question.find({
      challengeId: new mongoose.Types.ObjectId(challengeId),
    })
      .sort({ topicNumber: 1, createdAt: 1 })
      .lean();
    return questions;
  }

  async updateQuestion(challengeId: string, questionId: string, questionText: string): Promise<any> {
    // Verify the question belongs to the challenge
    const question = await Question.findOne({
      _id: new mongoose.Types.ObjectId(questionId),
      challengeId: new mongoose.Types.ObjectId(challengeId),
    });

    if (!question) {
      return null;
    }

    question.questionText = questionText;
    await question.save();
    return question.toObject();
  }

  async deleteQuestion(challengeId: string, questionId: string): Promise<boolean> {
    const result = await Question.deleteOne({
      _id: new mongoose.Types.ObjectId(questionId),
      challengeId: new mongoose.Types.ObjectId(challengeId),
    });
    return result.deletedCount > 0;
  }

  async createQuestion(challengeId: string, data: {
    topicNumber: number;
    questionText: string;
  }): Promise<any> {
    // Verify the challenge exists
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return null;
    }

    // Verify the topic belongs to the challenge
    if (!challenge.topicNumbers.includes(data.topicNumber)) {
      throw new Error('Topic does not belong to this challenge');
    }

    const question = new Question({
      topicNumber: data.topicNumber,
      questionText: data.questionText,
      challengeId: new mongoose.Types.ObjectId(challengeId),
      isDefault: false,
    });

    await question.save();
    return question.toObject();
  }
}

export const challengeService = new ChallengeService();

