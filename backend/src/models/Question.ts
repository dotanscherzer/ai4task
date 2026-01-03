import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  topicNumber: number;
  questionText: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    topicNumber: { type: Number, required: true, index: true },
    questionText: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

