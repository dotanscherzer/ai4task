import { Topic } from '../models/Topic';
import mongoose from 'mongoose';

export class TopicService {
  async listTopics(): Promise<any[]> {
    const topics = await Topic.find().sort({ number: 1 }).lean();
    return topics;
  }

  async getTopicById(id: string): Promise<any | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    const topic = await Topic.findById(id).lean();
    return topic;
  }

  async getTopicByNumber(number: number): Promise<any | null> {
    const topic = await Topic.findOne({ number }).lean();
    return topic;
  }

  async createTopic(data: {
    number: number;
    label: string;
    description: string;
  }): Promise<any> {
    // Check if topic number already exists
    const existingTopic = await Topic.findOne({ number: data.number });
    if (existingTopic) {
      throw new Error(`Topic with number ${data.number} already exists`);
    }

    const topic = new Topic({
      number: data.number,
      label: data.label,
      description: data.description,
    });

    await topic.save();
    return topic.toObject();
  }

  async updateTopic(id: string, data: {
    number?: number;
    label?: string;
    description?: string;
  }): Promise<any | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const topic = await Topic.findById(id);
    if (!topic) {
      return null;
    }

    // If number is being updated, check if it conflicts with another topic
    if (data.number !== undefined && data.number !== topic.number) {
      const existingTopic = await Topic.findOne({ number: data.number });
      if (existingTopic) {
        throw new Error(`Topic with number ${data.number} already exists`);
      }
    }

    // Update fields
    if (data.number !== undefined) topic.number = data.number;
    if (data.label !== undefined) topic.label = data.label;
    if (data.description !== undefined) topic.description = data.description;

    await topic.save();
    return topic.toObject();
  }

  async deleteTopic(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await Topic.findByIdAndDelete(id);
    return !!result;
  }
}

export const topicService = new TopicService();

