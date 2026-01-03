import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewQuestion extends Document {
  interviewId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewQuestionSchema = new Schema<IInterviewQuestion>(
  {
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

InterviewQuestionSchema.index({ interviewId: 1, sortOrder: 1 });

export const InterviewQuestion = mongoose.model<IInterviewQuestion>(
  'InterviewQuestion',
  InterviewQuestionSchema
);

