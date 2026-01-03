export interface Interview {
  _id: string;
  managerName: string;
  managerRole?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  shareToken: string;
  selectedTopics: number[];
  createdAt: string;
}

