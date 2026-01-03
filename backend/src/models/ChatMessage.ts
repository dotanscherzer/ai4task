import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  interviewId: mongoose.Types.ObjectId;
  role: 'manager' | 'bot' | 'system';
  content: string;
  topicNumber?: number;
  questionText?: string;
  meta?: {
    action?: string;
    model?: string;
    latencyMs?: number;
    tokenUsage?: {
      prompt?: number;
      completion?: number;
    };
    coveredQuestions?: string[];
    nextAction?: string;
    topicConfidence?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
    role: {
      type: String,
      enum: ['manager', 'bot', 'system'],
      required: true,
    },
    content: { type: String, required: true },
    topicNumber: { type: Number, required: false },
    questionText: { type: String, required: false },
    meta: { type: Schema.Types.Mixed, required: false },
  },
  {
    timestamps: true,
  }
);

ChatMessageSchema.index({ interviewId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

