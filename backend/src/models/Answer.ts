import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer extends Document {
  interviewId: mongoose.Types.ObjectId;
  topicNumber: number;
  questionText: string;
  answerText?: string;
  skipped: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
    topicNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    answerText: { type: String, required: false },
    skipped: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

AnswerSchema.index({ interviewId: 1, topicNumber: 1, createdAt: 1 });

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);

