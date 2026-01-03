export interface Challenge {
  _id: string;
  name: string;
  description: string;
  topicNumbers: number[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  _id: string;
  managerName: string;
  managerRole?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  shareToken: string;
  selectedTopics: number[];
  challengeId?: string | { _id: string; name: string; description?: string };
  createdAt: string;
}

