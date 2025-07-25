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

// Types for Exam Builder
export type QuestionType = 'objective' | 'discursive' | 'numeric';

export interface Question {
  id: string;
  type: QuestionType;
  statement: string;
  answerKey: string; // For 'objective' it's 'A'-'E', for others it's the text/number
  margin?: number; // For 'numeric'
  weight: number;
}

export interface Exam {
  id: string;
  userId: string;
  title: string;
  subject: string;
  date: Date;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}
