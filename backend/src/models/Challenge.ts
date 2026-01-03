import mongoose, { Schema, Document } from 'mongoose';

export interface IChallenge extends Document {
  name: string;
  description: string;
  topicNumbers: number[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    topicNumbers: { type: [Number], required: true, index: true },
    createdBy: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

// Index for finding challenges by topic number
ChallengeSchema.index({ topicNumbers: 1 });

export const Challenge = mongoose.model<IChallenge>('Challenge', ChallengeSchema);

