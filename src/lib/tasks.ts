
'use client';
import { db, isFirebaseConfigured } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { Task } from '@/types';

function getDb() {
    if (!isFirebaseConfigured || !db) {
        // This will be caught by the server and result in a 500 error.
        // On the client, this will be caught by the component and an error will be shown.
        throw new Error("Firestore is not initialized");
    }
    return db;
}


type TaskData = Omit<Task, 'id' | 'createdAt' | 'userId'>;
type TaskUpdateData = Partial<TaskData>;


export const onTasksSnapshot = (
    userId: string, 
    callback: (tasks: Task[]) => void,
    filters: { status: string; category: string }
): Unsubscribe => {
    
    let q = query(collection(getDb(), 'users', userId, 'tasks'), orderBy('dueDate', 'asc'));

    if (filters.status === 'incomplete') {
        q = query(q, where('completed', '==', false));
    }
    
    if (filters.category && filters.category !== 'all') {
        q = query(q, where('category', '==', filters.category));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tasks: Task[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                ...data,
                dueDate: (data.dueDate as Timestamp).toDate(),
            } as Task);
        });
        callback(tasks);
    });

    return unsubscribe;
};

export const addTask = async (userId: string, task: Omit<Task, 'id' | 'createdAt'| 'userId' | 'completed'>) => {
    await addDoc(collection(getDb(), 'users', userId, 'tasks'), {
        ...task,
        userId,
        completed: false,
        createdAt: serverTimestamp(),
    });
};

export const updateTask = async (userId: string, taskId: string, taskData: Partial<Task>) => {
    const taskRef = doc(getDb(), 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, taskData);
};

export const deleteTask = async (userId: string, taskId: string) => {
    const taskRef = doc(getDb(), 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
};

export const getCategories = async (userId: string): Promise<string[]> => {
    const tasksCollection = collection(getDb(), 'users', userId, 'tasks');
    const q = query(tasksCollection, where('category', '!=', ''));
    const querySnapshot = await getDocs(q);
    const categories = new Set<string>();
    querySnapshot.forEach(doc => {
        const task = doc.data() as Task;
        if (task.category) {
            categories.add(task.category);
        }
    });
    return Array.from(categories);
};
