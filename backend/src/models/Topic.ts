import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  number: number;
  label: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    number: { type: Number, required: true, unique: true, index: true },
    label: { type: String, required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Topic = mongoose.model<ITopic>('Topic', TopicSchema);

