'use client';
import { useState } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updateTask } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import TaskForm from './TaskForm';
import DeleteTaskDialog from './DeleteTaskDialog';
import { useToast } from '@/hooks/use-toast';

interface TaskItemProps {
  task: Task;
}

const priorityVariantMap = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
} as const;

const priorityNameMap = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
};

export default function TaskItem({ task }: TaskItemProps) {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleToggleComplete = async () => {
    if (!user) return;
    try {
      await updateTask(user.uid, task.id, { completed: !task.completed });
      toast({
          title: `Tarefa ${!task.completed ? 'concluída' : 'marcada como pendente'}!`,
      });
    } catch (error) {
        console.error("Erro ao atualizar status da tarefa:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao atualizar tarefa',
            description: 'Não foi possível atualizar o status da tarefa.',
        });
    }
  };

  return (
    <>
      <Card className={cn('flex flex-col h-full', task.completed && 'bg-muted/50')}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
               <Checkbox
                id={`complete-${task.id}`}
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="h-5 w-5 mt-1"
                aria-label={task.completed ? "Marcar como pendente" : "Marcar como concluída"}
               />
               <CardTitle className={cn('text-lg font-semibold leading-tight break-words', task.completed && 'line-through text-muted-foreground')}>
                {task.title}
               </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setIsFormOpen(true)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar Tarefa</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir Tarefa</span>
              </Button>
            </div>
          </div>
          {task.description && (
            <CardDescription className={cn('pt-2 pl-8 break-words', task.completed && 'line-through text-muted-foreground/80')}>
                {task.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow pb-4">
            {task.dueDate && (
                <div className="text-sm text-muted-foreground flex items-center mt-2 pl-8">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Vence em: {format(task.dueDate, 'PPP', { locale: ptBR })}
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-2">
            <div>
              {task.category && <Badge variant="outline">{task.category}</Badge>}
            </div>
            {task.priority && <Badge variant={priorityVariantMap[task.priority] || 'secondary'}>{priorityNameMap[task.priority] || 'Média'}</Badge>}
        </CardFooter>
      </Card>
      <TaskForm isOpen={isFormOpen} setIsOpen={setIsFormOpen} task={task} />
      <DeleteTaskDialog isOpen={isDeleteDialogOpen} setIsOpen={setIsDeleteDialogOpen} taskId={task.id} />
    </>
  );
}