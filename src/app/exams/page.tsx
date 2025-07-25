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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getExamsForUser, deleteExam, duplicateExam, getExamById } from '@/lib/exams';
import type { Exam } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Type definition for dynamically imported PDF components
type PdfComponents = {
  PDFDownloadLink: typeof import('@react-pdf/renderer').PDFDownloadLink;
  AnswerSheetPDF: React.FC<{ exam: Exam }>;
};

export default function ExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null);
  const [selectedExamForPdf, setSelectedExamForPdf] = useState<Exam | null>(null);

  useEffect(() => {
    // Pre-load PDF components on the client side after initial mount
    const loadPdfModules = async () => {
      try {
        const [{ PDFDownloadLink, Font }, { default: AnswerSheetPDF }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/exams/AnswerSheetPDF"),
        ]);
        
        // Register fonts once
        if (Font.getRegisteredFontFamilies().indexOf('Inter') === -1) {
            Font.register({
              family: 'Inter',
              fonts: [
                { src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa.woff', fontWeight: 400 },
                { src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa.woff', fontWeight: 500 },
                { src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa.woff', fontWeight: 700 },
              ],
            });
        }
        setPdfComponents({ PDFDownloadLink, AnswerSheetPDF: AnswerSheetPDF as React.FC<{ exam: Exam }> });
      } catch (error) {
        console.error("Failed to load PDF modules:", error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar módulo PDF',
          description: 'Não será possível gerar PDFs. Recarregue a página.',
        });
      }
    };
    loadPdfModules();
  }, [toast]);
  
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

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    setPdfStatus('idle');
    setSelectedExamForPdf(null);
  }
  
  const handleGeneratePdf = async (examId: string) => {
    if (!user || !pdfComponents) return;
    
    setIsPdfModalOpen(true);
    setPdfStatus('loading');
    
    try {
      const exam = await getExamById(user.uid, examId);
      
      if (!exam || !exam.questions || exam.questions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Não é possível gerar PDF',
          description: 'A prova está incompleta ou não tem questões.',
        });
        setPdfStatus('error');
        return;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log("[PDF] exam valid:", exam.id);
      }
      
      setSelectedExamForPdf(exam);
      setPdfStatus('ready');

    } catch (err) {
       console.error("Error preparing PDF:", err);
       toast({
          variant: 'destructive',
          title: 'Erro ao buscar dados da prova',
          description: 'Não foi possível carregar os dados para o PDF.',
       });
       setPdfStatus('error');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const renderPdfModalContent = () => {
     switch (pdfStatus) {
        case 'loading':
            return (
                <div className="flex flex-col items-center gap-2">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                    <p>Gerando PDF...</p>
                </div>
            );
        case 'ready':
          if (pdfComponents && selectedExamForPdf) {
            const { PDFDownloadLink, AnswerSheetPDF } = pdfComponents;
            return (
               <PDFDownloadLink
                  document={<AnswerSheetPDF exam={selectedExamForPdf} />}
                  fileName={`${selectedExamForPdf.title.replace(/\s/g, '_')}_gabarito.pdf`}
                  onError={(e) => {
                    console.error("PDF generation error:", e)
                    toast({ variant: 'destructive', title: 'Erro ao Gerar PDF', description: 'Ocorreu um erro inesperado. Tente novamente.'});
                    setPdfStatus('error');
                  }}
                  className="w-full"
                >
                  {({ loading: pdfLoading }) => (
                    <Button disabled={pdfLoading} className="w-full" onClick={() => {
                        if(!pdfLoading) {
                          toast({ title: 'Download iniciado!' });
                          setTimeout(() => closePdfModal(), 1000);
                        }
                    }}>
                       {pdfLoading ? (
                         <>
                           <LoaderCircle className="animate-spin mr-2" />
                           Preparando arquivo...
                         </>
                       ) : (
                         <>
                           <Download className="mr-2" />
                           Baixar PDF Agora
                         </>
                       )}
                    </Button>
                  )}
                </PDFDownloadLink>
            )
          }
          return null; // Fallback
        case 'error':
             return <p>Ocorreu um erro ao preparar o PDF. Por favor, feche e tente novamente.</p>;
        default:
             return null;
     }
  }

  return (
    <>
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
                      Data: {exam.date ? format(new Date(exam.date), 'PPP', { locale: ptBR }) : 'Data não definida'}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(exam.id)} title="Duplicar">
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Duplicar</span>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Editar">
                      <Link href={`/exams/edit/${exam.id}`}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleGeneratePdf(exam.id)}
                      disabled={!pdfComponents || pdfStatus !== 'idle'}
                      title={"Gerar gabarito PDF"}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Gerar gabarito PDF</span>
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir">
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

      <Dialog open={isPdfModalOpen} onOpenChange={closePdfModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Gabarito em PDF</DialogTitle>
            <DialogDescription>
              Seu gabarito está sendo preparado para download.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[10rem]">
            {renderPdfModalContent()}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={closePdfModal}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
