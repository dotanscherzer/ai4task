import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  topicNumber: number;
  questionText: string;
  isDefault: boolean;
  challengeId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    topicNumber: { type: Number, required: true, index: true },
    questionText: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: false, index: true },
  },
  {
    timestamps: true,
  }
);

// Index for finding questions by challenge
QuestionSchema.index({ challengeId: 1, topicNumber: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

