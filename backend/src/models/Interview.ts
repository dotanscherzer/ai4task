import mongoose, { Schema, Document } from 'mongoose';

export interface IInterview extends Document {
  adminUserId?: string;
  adminEmail: string;
  managerName: string;
  managerRole?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  shareToken: string;
  selectedTopics: number[];
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    adminUserId: { type: String, required: false },
    adminEmail: { type: String, required: true, default: 'dotan.scherzer@gmail.com' },
    managerName: { type: String, required: true },
    managerRole: { type: String, required: false },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    shareToken: { type: String, required: true, unique: true, index: true },
    selectedTopics: { type: [Number], required: true },
  },
  {
    timestamps: true,
  }
);

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);

