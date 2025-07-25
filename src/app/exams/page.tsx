'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, PlusCircle, FileText, Inbox, Edit, Copy, Trash2, Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getExamsForUser, deleteExam, duplicateExam } from '@/lib/exams';
import type { Exam } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDownloadLink } from '@react-pdf/renderer';
import AnswerSheetPDF from '@/components/exams/AnswerSheetPDF';

export default function ExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const fetchExams = async () => {
        setLoading(true);
        try {
          const userExams = await getExamsForUser(user.uid);
          setExams(userExams);
        } catch (error) {
          console.error("Failed to fetch exams:", error);
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar provas',
            description: 'Não foi possível buscar suas provas. Tente novamente.',
          });
        } finally {
          setLoading(false);
        }
      };
      fetchExams();
    }
  }, [user, toast]);
  
  const handleDelete = async (examId: string) => {
    if (!user) return;
    try {
      await deleteExam(user.uid, examId);
      setExams(exams.filter(exam => exam.id !== examId));
      toast({ title: 'Prova excluída com sucesso!' });
    } catch (error) {
      console.error("Failed to delete exam:", error);
      toast({ variant: 'destructive', title: 'Erro ao excluir prova' });
    }
  };

  const handleDuplicate = async (examId: string) => {
    if (!user) return;
    try {
      const newExam = await duplicateExam(user.uid, examId);
      if (newExam) {
        setExams([newExam, ...exams]);
        toast({ title: 'Prova duplicada com sucesso!' });
      }
    } catch (error) {
      console.error("Failed to duplicate exam:", error);
      toast({ variant: 'destructive', title: 'Erro ao duplicar prova' });
    }
  };

  const isExamValidForPdf = (exam: Exam) => {
    return exam && exam.questions && exam.questions.length > 0;
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Minhas Provas</h1>
          <Button asChild>
            <Link href="/exams/new">
              <PlusCircle className="mr-2" />
              Nova Prova
            </Link>
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground mt-2">Carregando provas...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 border-dashed border-2 rounded-lg">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma prova encontrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira prova para começar.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exams.map(exam => (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="text-primary" /> {exam.title}
                  </CardTitle>
                  <CardDescription>
                    {exam.subject} - {exam.questions.length} questões
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    Data: {format(exam.date, 'PPP', { locale: ptBR })}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                   <Button variant="ghost" size="icon" onClick={() => handleDuplicate(exam.id)}>
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Duplicar</span>
                  </Button>
                   <Button variant="ghost" size="icon" asChild>
                    <Link href={`/exams/edit/${exam.id}`}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Link>
                  </Button>
                   {isExamValidForPdf(exam) ? (
                    <PDFDownloadLink
                      document={<AnswerSheetPDF exam={exam} />}
                      fileName={`${exam.title.replace(/\s/g, '_')}_gabarito.pdf`}
                      onError={() => toast({ variant: 'destructive', title: 'Erro ao Gerar PDF', description: 'Ocorreu um erro inesperado. Tente novamente.'})}
                    >
                      {({ loading }) => (
                        <Button variant="ghost" size="icon" disabled={loading} title="Baixar gabarito">
                           {loading ? <LoaderCircle className="animate-spin" /> : <Download className="h-4 w-4" />}
                           <span className="sr-only">Baixar gabarito</span>
                        </Button>
                      )}
                    </PDFDownloadLink>
                   ) : (
                      <Button variant="ghost" size="icon" disabled title="Prova sem questões">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Prova sem questões</span>
                      </Button>
                   )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                         <span className="sr-only">Excluir</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza que deseja excluir esta prova?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(exam.id)} className="bg-destructive hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
