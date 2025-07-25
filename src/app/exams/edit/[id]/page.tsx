'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { getExamById } from '@/lib/exams';
import type { Exam } from '@/types';
import ExamBuilder from '@/components/exams/ExamBuilder';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EditExamPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && typeof id === 'string') {
      const fetchExam = async () => {
        setLoading(true);
        setError(null);
        try {
          const fetchedExam = await getExamById(user.uid, id);
          if (fetchedExam) {
            setExam(fetchedExam);
          } else {
            setError('Prova não encontrada.');
             toast({ variant: 'destructive', title: 'Erro', description: 'Prova não encontrada ou você não tem permissão para editá-la.' });
            router.push('/exams');
          }
        } catch (err) {
          console.error("Failed to fetch exam:", err);
          setError('Falha ao carregar a prova.');
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados da prova.' });
        } finally {
          setLoading(false);
        }
      };
      fetchExam();
    }
  }, [user, id, router, toast]);

  if (authLoading || loading) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Carregando editor de prova...</p>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">
       {error}
      </div>
    );
  }

  return exam ? <ExamBuilder existingExam={exam} /> : null;
}
