'use client';
import { useAuth } from '@/context/AuthContext';
import TaskDashboard from '@/components/tasks/TaskDashboard';
import { Button } from '@/components/ui/button';
import { LoaderCircle, ListTodo } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import FirebaseConfigNotice from '@/components/FirebaseConfigNotice';

export default function Home() {
  const { user, loading, isFirebaseConfigured } = useAuth();

  if (!isFirebaseConfigured) {
    return <FirebaseConfigNotice />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col">
        {user ? <TaskDashboard /> : <LandingPage />}
      </main>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="container relative flex-1">
      <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <ListTodo className="h-20 w-20 text-primary" />
        <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          Task Ticker
        </h1>
        <p className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl">
          Sua ferramenta de gerenciamento de tarefas pessoal, simples e eficiente. Acompanhe seus afazeres com facilidade.
        </p>
        <div className="flex w-full items-center justify-center space-x-4 py-4 md:py-10">
          <Button asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Cadastrar</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
