import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Challenge } from '../models/Challenge';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { llmService } from '../services/llmService';

dotenv.config();

async function migrateChallenges() {
  try {
    await connectDatabase();
    console.log('🔍 Starting challenges migration...\n');

    // Step 1: Check and seed Topics if needed
    const topicsCount = await Topic.countDocuments();
    console.log(`📊 Found ${topicsCount} topics in database`);

    if (topicsCount === 0) {
      console.log('⚠️ No topics found. Please run seed script first: npm run seed');
      console.log('   Topics are required for question generation.');
      process.exit(1);
    }

    // Step 2: Find challenges without questions
    const allChallenges = await Challenge.find().lean();
    console.log(`📊 Found ${allChallenges.length} challenges in database\n`);

    if (allChallenges.length === 0) {
      console.log('✅ No challenges to migrate');
      process.exit(0);
    }

    // Check which challenges have questions
    const challengesWithQuestions = new Set<string>();
    const questionsByChallenge = await Question.aggregate([
      { $match: { challengeId: { $ne: null } } },
      { $group: { _id: '$challengeId', count: { $sum: 1 } } },
    ]);

    questionsByChallenge.forEach((item) => {
      if (item._id) {
        challengesWithQuestions.add(item._id.toString());
      }
    });

    const challengesWithoutQuestions = allChallenges.filter(
      (c) => !challengesWithQuestions.has(c._id.toString())
    );

    console.log(`📋 Challenges with questions: ${challengesWithQuestions.size}`);
    console.log(`📋 Challenges without questions: ${challengesWithoutQuestions.length}\n`);

    if (challengesWithoutQuestions.length === 0) {
      console.log('✅ All challenges already have questions');
      process.exit(0);
    }

    // Step 3: Generate questions for challenges without questions
    console.log('🚀 Generating questions for challenges without questions...\n');

    const hasLLMKey = !!process.env.GEMINI_API_KEY;
    if (!hasLLMKey) {
      console.log('⚠️ GEMINI_API_KEY not set. Cannot generate questions automatically.');
      console.log('   Please set GEMINI_API_KEY in your .env file and run this script again.');
      process.exit(1);
    }

    let totalQuestionsCreated = 0;
    let successfulChallenges = 0;
    let failedChallenges = 0;

    for (const challenge of challengesWithoutQuestions) {
      console.log(`\n📝 Processing challenge: ${challenge.name} (${challenge._id})`);
      console.log(`   Topics: ${challenge.topicNumbers.join(', ')}`);

      try {
        // Fetch topics for this challenge
        const topics = await Topic.find({ number: { $in: challenge.topicNumbers } });

        if (topics.length === 0) {
          console.log(`   ⚠️ No topics found for numbers: ${challenge.topicNumbers.join(', ')}`);
          failedChallenges++;
          continue;
        }

        if (topics.length !== challenge.topicNumbers.length) {
          const foundNumbers = topics.map((t) => t.number);
          const missingNumbers = challenge.topicNumbers.filter((n) => !foundNumbers.includes(n));
          console.log(`   ⚠️ Some topics not found: ${missingNumbers.join(', ')}`);
        }

        let challengeQuestionsCreated = 0;

        // Generate questions for each topic
        for (const topic of topics) {
          try {
            const questions = await llmService.generateQuestionsForChallenge(
              challenge.name,
              challenge.description,
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
                challengeId: challenge._id,
                isDefault: false,
              }));

              await Question.insertMany(questionDocs);
              challengeQuestionsCreated += questions.length;
              console.log(`   ✅ Created ${questions.length} questions for topic ${topic.number}`);
            } else {
              console.log(`   ⚠️ No questions generated for topic ${topic.number}`);
            }
          } catch (error: any) {
            console.log(`   ❌ Error generating questions for topic ${topic.number}: ${error.message || error}`);
          }
        }

        if (challengeQuestionsCreated > 0) {
          totalQuestionsCreated += challengeQuestionsCreated;
          successfulChallenges++;
          console.log(`   ✅ Total: ${challengeQuestionsCreated} questions created for this challenge`);
        } else {
          console.log(`   ⚠️ No questions were created for this challenge`);
          failedChallenges++;
        }
      } catch (error: any) {
        console.log(`   ❌ Error processing challenge: ${error.message || error}`);
        failedChallenges++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully processed: ${successfulChallenges} challenges`);
    console.log(`   ❌ Failed: ${failedChallenges} challenges`);
    console.log(`   📝 Total questions created: ${totalQuestionsCreated}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateChallenges();

