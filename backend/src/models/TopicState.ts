import mongoose, { Schema, Document } from 'mongoose';

export interface ITopicState extends Document {
  interviewId: mongoose.Types.ObjectId;
  topicNumber: number;
  confidence: number;
  coveredPoints: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TopicStateSchema = new Schema<ITopicState>(
  {
    interviewId: { type: Schema.Types.ObjectId, ref: 'Interview', required: true },
    topicNumber: { type: Number, required: true },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    coveredPoints: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

TopicStateSchema.index({ interviewId: 1, topicNumber: 1 }, { unique: true });

export const TopicState = mongoose.model<ITopicState>('TopicState', TopicStateSchema);

