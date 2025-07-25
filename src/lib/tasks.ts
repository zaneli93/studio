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
  onSnapshot, 
  where,
  getDocs,
  type Unsubscribe 
} from 'firebase/firestore';
import type { Task, TaskCreate } from '@/types';


function getDb() {
    if (!isFirebaseConfigured || !db) {
        console.warn("Atenção: O Firestore não está configurado. As operações com o banco de dados serão desabilitadas.");
        throw new Error("O Firestore não está inicializado");
    }
    return db;
}

const getTasksCollection = (userId: string) => {
  return collection(getDb(), 'tasks', userId, 'items');
}

export const subscribeTasks = (
    userId: string, 
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    try {
        const tasksCollection = getTasksCollection(userId);
        const q = query(tasksCollection, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasks: Task[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                tasks.push({
                    id: doc.id,
                    ...data,
                    dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : null,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                } as Task);
            });
            callback(tasks);
        }, (error) => {
            console.error("Erro ao buscar tarefas em tempo real:", error);
            onError(error);
        });

        return unsubscribe;
    } catch (error) {
        console.error("Falha ao iniciar a subscrição de tarefas:", error);
        onError(error as Error);
        // Return a no-op unsubscribe function
        return () => {};
    }
};

export const createTask = async (userId: string, task: TaskCreate) => {
    const tasksCollection = getTasksCollection(userId);
    await addDoc(tasksCollection, {
        ...task,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
};

export const updateTask = async (userId: string, taskId: string, taskData: Partial<TaskCreate & { completed: boolean }>) => {
    const taskRef = doc(getDb(), 'tasks', userId, 'items', taskId);
    await updateDoc(taskRef, {
      ...taskData,
      updatedAt: serverTimestamp(),
    });
};

export const deleteTask = async (userId: string, taskId: string) => {
    const taskRef = doc(getDb(), 'tasks', userId, 'items', taskId);
    await deleteDoc(taskRef);
};

export const getCategories = async (userId: string): Promise<string[]> => {
    try {
        const tasksCollection = getTasksCollection(userId);
        const q = query(tasksCollection, where('category', '!=', null));
        const querySnapshot = await getDocs(q);
        const categories = new Set<string>();
        querySnapshot.forEach(doc => {
            const task = doc.data() as Task;
            if (task.category) {
                categories.add(task.category);
            }
        });
        return Array.from(categories);
    } catch(e) {
        console.error("Erro ao buscar categorias", e)
        return []
    }
};