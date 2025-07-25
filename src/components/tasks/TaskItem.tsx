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


export default function TaskItem({ task }: TaskItemProps) {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleToggleComplete = async () => {
    if (!user) return;
    try {
      await updateTask(user.uid, task.id, { completed: !task.completed });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task status.',
      });
    }
  };

  return (
    <>
      <Card className={cn('flex flex-col', task.completed && 'bg-muted/50')}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
               <Checkbox
                id={`complete-${task.id}`}
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="h-5 w-5"
               />
               <CardTitle className={cn('text-lg', task.completed && 'line-through text-muted-foreground')}>
                {task.title}
               </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFormOpen(true)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Task</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Task</span>
              </Button>
            </div>
          </div>
          <CardDescription className={cn(task.completed && 'line-through text-muted-foreground/80')}>
            {task.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="text-sm text-muted-foreground flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Due: {format(task.dueDate, 'PPP')}
            </div>
        </CardContent>
        <CardFooter className="flex justify-between">
            <div>
              {task.category && <Badge variant="outline">{task.category}</Badge>}
            </div>
          <Badge variant={priorityVariantMap[task.priority]}>{task.priority}</Badge>
        </CardFooter>
      </Card>
      <TaskForm isOpen={isFormOpen} setIsOpen={setIsFormOpen} task={task} />
      <DeleteTaskDialog isOpen={isDeleteDialogOpen} setIsOpen={setIsDeleteDialogOpen} taskId={task.id} />
    </>
  );
}
