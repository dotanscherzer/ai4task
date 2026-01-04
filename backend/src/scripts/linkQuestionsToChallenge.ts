import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { Challenge } from '../models/Challenge';
import { Question } from '../models/Question';

dotenv.config();

async function linkQuestionsToChallenge() {
  try {
    await connectDatabase();
    console.log('🔍 Starting migration: Linking questions to challenge...\n');

    // Step 1: Find the challenge
    const challenges = await Challenge.find().lean();
    
    if (challenges.length === 0) {
      console.log('❌ No challenges found in database. Cannot link questions.');
      process.exit(1);
    }

    if (challenges.length > 1) {
      console.log(`⚠️ Found ${challenges.length} challenges. Using the first one.`);
    }

    const challenge = challenges[0];
    console.log(`📋 Found challenge: ${challenge.name} (${challenge._id})\n`);

    // Step 2: Find questions without challengeId
    const questionsWithoutChallenge = await Question.find({
      $or: [
        { challengeId: { $exists: false } },
        { challengeId: null },
      ],
    });

    console.log(`📊 Found ${questionsWithoutChallenge.length} questions without challengeId`);

    if (questionsWithoutChallenge.length === 0) {
      console.log('✅ All questions already have challengeId assigned.');
      process.exit(0);
    }

    // Step 3: Update all questions to link them to the challenge
    console.log(`\n🔗 Linking ${questionsWithoutChallenge.length} questions to challenge...`);

    const result = await Question.updateMany(
      {
        $or: [
          { challengeId: { $exists: false } },
          { challengeId: null },
        ],
      },
      {
        $set: {
          challengeId: challenge._id,
          isDefault: false,
        },
      }
    );

    console.log(`\n✅ Successfully linked ${result.modifiedCount} questions to challenge`);
    console.log(`📝 Challenge: ${challenge.name}`);
    console.log(`📝 Challenge ID: ${challenge._id}`);

    // Step 4: Verify
    const questionsWithChallenge = await Question.countDocuments({
      challengeId: challenge._id,
    });
    console.log(`\n📊 Total questions linked to this challenge: ${questionsWithChallenge}`);

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

linkQuestionsToChallenge();

