import { type Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskCreate = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed'>;