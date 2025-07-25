'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeTasks } from '@/lib/tasks';
import type { Task } from '@/types';
import TaskItem from './TaskItem';
import { Button } from '@/components/ui/button';
import { PlusCircle, LoaderCircle, Inbox, WifiOff } from 'lucide-react';
import TaskForm from './TaskForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function TaskDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeTasks(user.uid, 
      (newTasks) => {
        setTasks(newTasks);
        const newCategories = Array.from(new Set(newTasks.map(t => t.category).filter(Boolean)));
        setCategories(newCategories as string[]);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Não foi possível carregar as tarefas. Verifique sua conexão ou permissões.");
        setLoading(false);
        toast({
          variant: 'destructive',
          title: 'Erro ao buscar tarefas',
          description: 'Verifique sua conexão e tente recarregar a página.'
        });
      }
    );
    
    return () => unsubscribe();
  }, [user, toast]);

  const filteredTasks = useMemo(() => {
    if (filterCategory === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.category === filterCategory);
  }, [tasks, filterCategory]);

  const pendingTasks = useMemo(() => filteredTasks.filter(t => !t.completed), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter(t => t.completed), [filteredTasks]);

  const renderTaskList = useCallback((taskList: Task[], emptyState: React.ReactNode) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-10">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4">Carregando tarefas...</p>
        </div>
      );
    }
     if (error) {
      return (
         <div className="text-center py-16 border-dashed border-2 rounded-lg border-destructive/50">
            <WifiOff className="mx-auto h-12 w-12 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold text-destructive">Erro de Conexão</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      )
    }
    if (taskList.length > 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {taskList.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      );
    }
    return emptyState;
  }, [loading, error]);


  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Suas Tarefas</h1>
        <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Tarefa
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pendentes <Badge variant="secondary" className="ml-2">{pendingTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídas <Badge variant="secondary" className="ml-2">{completedTasks.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {renderTaskList(pendingTasks, (
             <div className="text-center py-16 border-dashed border-2 rounded-lg">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma tarefa pendente</h3>
                <p className="mt-1 text-sm text-muted-foreground">Adicione uma nova tarefa para começar.</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="completed">
           {renderTaskList(completedTasks, (
                <div className="text-center py-16 border-dashed border-2 rounded-lg">
                    <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma tarefa concluída</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Conclua uma tarefa para vê-la aqui.</p>
                </div>
            ))}
        </TabsContent>
      </Tabs>
      
      <TaskForm isOpen={isFormOpen} setIsOpen={setIsFormOpen} />
    </div>
  );
}