'use client';
import { db, isFirebaseConfigured } from './firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp, 
  getDocs,
  getDoc,
  where
} from 'firebase/firestore';
import type { Exam, Question } from '@/types';


function getDb() {
    if (!isFirebaseConfigured || !db) {
        const warning = "Atenção: O Firestore não está configurado. As operações com o banco de dados serão desabilitadas.";
        console.warn(warning);
        throw new Error("O Firestore não está inicializado");
    }
    return db;
}

const getExamsCollection = (userId: string) => {
  return collection(getDb(), 'exams', userId, 'items');
}

// Create
export const createExam = async (userId: string, examData: Omit<Exam, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const examsCollection = getExamsCollection(userId);
    const docRef = await addDoc(examsCollection, {
        ...examData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
};

// Read all for user
export const getExamsForUser = async (userId: string): Promise<Exam[]> => {
    const examsCollection = getExamsCollection(userId);
    const q = query(examsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Exam;
    });
};

// Read one by ID
export const getExamById = async (userId: string, examId: string): Promise<Exam | null> => {
    const docRef = doc(getDb(), 'exams', userId, 'items', examId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Exam;
    }
    return null;
};

// Update
export const updateExam = async (userId: string, examId: string, examData: Partial<Omit<Exam, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    const examRef = doc(getDb(), 'exams', userId, 'items', examId);
    await updateDoc(examRef, {
        ...examData,
        updatedAt: serverTimestamp(),
    });
};

// Delete
export const deleteExam = async (userId: string, examId: string) => {
    const examRef = doc(getDb(), 'exams', userId, 'items', examId);
    await deleteDoc(examRef);
};


// Duplicate
export const duplicateExam = async (userId: string, examId: string): Promise<Exam | null> => {
  const originalExam = await getExamById(userId, examId);
  if (!originalExam) return null;

  const duplicatedData = {
    ...originalExam,
    title: `${originalExam.title} (Cópia)`,
    date: new Date(), // Set to today's date
  };

  // Remove fields that should be regenerated
  const { id, createdAt, updatedAt, ...newExamData } = duplicatedData;

  const newExamId = await createExam(userId, newExamData);
  return getExamById(userId, newExamId);
};
