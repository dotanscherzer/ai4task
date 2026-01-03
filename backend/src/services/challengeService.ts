import { Challenge } from '../models/Challenge';
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
    const challenge = await Challenge.findByIdAndUpdate(
      challengeId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!challenge) {
      return null;
    }

    return challenge.toObject();
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
}

export const challengeService = new ChallengeService();

