'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { onTasksSnapshot, getCategories } from '@/lib/tasks';
import type { Task } from '@/types';
import TaskItem from './TaskItem';
import { Button } from '@/components/ui/button';
import { PlusCircle, LoaderCircle, Inbox } from 'lucide-react';
import TaskForm from './TaskForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TaskDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState({ status: 'all', category: 'all' });

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = onTasksSnapshot(user.uid, (newTasks) => {
      setTasks(newTasks);
      setLoading(false);
    }, filters);
    
    getCategories(user.uid).then(setCategories);

    return () => unsubscribe();
  }, [user, filters]);
  
  useEffect(() => {
    if(user) {
        getCategories(user.uid).then(setCategories);
    }
  }, [tasks, user])


  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Your Tasks</h1>
        <div className="flex items-center gap-2">
           <Select value={filters.status} onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(value) => setFilters(f => ({ ...f, category: value }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>

          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tasks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No tasks yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Click "New Task" to add your first to-do.</p>
        </div>
      )}

      <TaskForm isOpen={isFormOpen} setIsOpen={setIsFormOpen} />
    </div>
  );
}
