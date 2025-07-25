'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteTask } from '@/lib/tasks';
import { Button } from '../ui/button';

interface DeleteTaskDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  taskId: string;
}

export default function DeleteTaskDialog({ isOpen, setIsOpen, taskId }: DeleteTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteTask(user.uid, taskId);
      toast({ title: 'Tarefa excluída com sucesso!' });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir tarefa',
        description: 'Não foi possível excluir a tarefa.',
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja excluir esta tarefa?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente sua tarefa dos nossos servidores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
