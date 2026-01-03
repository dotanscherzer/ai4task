import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewSession extends Document {
  interviewId: mongoose.Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  answeredCount: number;
  skippedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
    startedAt: { type: Date, required: false },
    completedAt: { type: Date, required: false },
    answeredCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const InterviewSession = mongoose.model<IInterviewSession>(
  'InterviewSession',
  InterviewSessionSchema
);

