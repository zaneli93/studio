import { type Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  completed: boolean;
  createdAt: Timestamp;
  userId: string;
}
