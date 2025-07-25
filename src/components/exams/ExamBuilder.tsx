'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createExam, updateExam } from '@/lib/exams';
import type { Exam, Question } from '@/types';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoaderCircle, CalendarIcon, PlusCircle, Trash2, ArrowLeft, ArrowRight, Save, FileCheck2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['objective', 'discursive', 'numeric']),
  statement: z.string().min(1, 'O enunciado é obrigatório.'),
  answerKey: z.string().min(1, 'A resposta é obrigatória.'),
  margin: z.coerce.number().optional(),
  weight: z.coerce.number().min(0.1, 'O peso deve ser maior que zero.'),
});

const formSchema = z.object({
  title: z.string().min(1, 'O título da prova é obrigatório.'),
  subject: z.string().min(1, 'A disciplina/turma é obrigatória.'),
  date: z.date({ required_error: 'A data da prova é obrigatória.' }),
  questions: z.array(questionSchema).min(1, 'A prova deve ter pelo menos uma questão.'),
});

type ExamFormData = z.infer<typeof formSchema>;

interface ExamBuilderProps {
  existingExam?: Exam;
}

export default function ExamBuilder({ existingExam }: ExamBuilderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numberOfQuestions, setNumberOfQuestions] = useState(existingExam?.questions.length || 1);

  const form = useForm<ExamFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingExam
      ? {
          ...existingExam,
          date: new Date(existingExam.date),
        }
      : {
          title: '',
          subject: '',
          date: new Date(),
          questions: [],
        },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "questions",
  });
  
  useEffect(() => {
    if (existingExam) {
       setNumberOfQuestions(existingExam.questions.length);
    } else {
        const initialQuestions = Array.from({ length: numberOfQuestions }, () => ({
            id: uuidv4(),
            type: 'objective',
            statement: '',
            answerKey: 'A',
            margin: 0,
            weight: 1,
        } as Question));
        replace(initialQuestions);
    }
  }, [numberOfQuestions, replace, existingExam]);
  
  const handleNumberOfQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let num = parseInt(e.target.value, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 100) num = 100; // Cap at 100 questions
    setNumberOfQuestions(num);
  };
  
  const nextStep = async () => {
     let isValid = false;
     if (currentStep === 0) {
       isValid = await form.trigger(['title', 'subject', 'date']);
     } else if (currentStep === 1) {
       // Step 2 (questions list) just proceeds
       isValid = true;
     }
     if (isValid) setCurrentStep(s => s + 1);
  };
  const prevStep = () => setCurrentStep(s => s - 1);

  const onSubmit = async (data: ExamFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const examPayload = {
        title: data.title,
        subject: data.subject,
        date: data.date,
        questions: data.questions,
      };

      if (existingExam) {
        await updateExam(user.uid, existingExam.id, examPayload);
        toast({ title: 'Prova atualizada com sucesso!' });
      } else {
        await createExam(user.uid, examPayload);
        toast({ title: 'Prova criada com sucesso!' });
      }
      router.push('/exams');
    } catch (error) {
      console.error("Failed to save exam:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar prova',
        description: 'Ocorreu um problema ao salvar a prova. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // General Info
        return (
          <Card>
            <CardHeader>
              <CardTitle>Passo 1: Dados Gerais da Prova</CardTitle>
              <CardDescription>Preencha as informações básicas da sua avaliação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Prova</FormLabel>
                  <FormControl><Input placeholder="Ex: Avaliação Bimestral de Matemática" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="subject" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Disciplina / Turma</FormLabel>
                  <FormControl><Input placeholder="Ex: 8º Ano B" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="date" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Aplicação</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
        );
      case 1: // Number of Questions
        return (
          <Card>
            <CardHeader>
              <CardTitle>Passo 2: Quantidade de Questões</CardTitle>
              <CardDescription>Defina quantas questões sua prova terá.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem>
                <FormLabel>Número de Questões</FormLabel>
                <FormControl>
                  <Input type="number" min="1" value={numberOfQuestions} onChange={handleNumberOfQuestionsChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </CardContent>
          </Card>
        );
      case 2: // Build Questions
        return (
          <Card>
            <CardHeader>
              <CardTitle>Passo 3: Elaborar Questões</CardTitle>
              <CardDescription>Preencha os detalhes de cada questão da prova.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-muted/30">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold">Questão {index + 1}</h4>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField name={`questions.${index}.type`} control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="objective">Objetiva</SelectItem>
                              <SelectItem value="discursive">Dissertativa</SelectItem>
                              <SelectItem value="numeric">Numérica</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField name={`questions.${index}.weight`} control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (Pontos)</FormLabel>
                          <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )} />
                  </div>
                  <FormField name={`questions.${index}.statement`} control={form.control} render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Enunciado</FormLabel>
                      <FormControl><Textarea placeholder="Digite o enunciado da questão..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {form.watch(`questions.${index}.type`) === 'objective' && (
                     <FormField name={`questions.${index}.answerKey`} control={form.control} render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Resposta Correta</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                              <SelectItem value="E">E</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                  )}
                  {form.watch(`questions.${index}.type`) === 'discursive' && (
                     <FormField name={`questions.${index}.answerKey`} control={form.control} render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Gabarito / Resposta Modelo</FormLabel>
                          <FormControl><Textarea placeholder="Digite a resposta esperada ou um modelo de gabarito." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  )}
                  {form.watch(`questions.${index}.type`) === 'numeric' && (
                     <div className="grid grid-cols-2 gap-4 mt-4">
                        <FormField name={`questions.${index}.answerKey`} control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resposta Numérica</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                               <FormMessage />
                            </FormItem>
                          )} />
                         <FormField name={`questions.${index}.margin`} control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Margem de Erro (+/-)</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                               <FormMessage />
                            </FormItem>
                          )} />
                     </div>
                  )}
                </Card>
              ))}
            </CardContent>
          </Card>
        );
         case 3: // Final Review
            const formData = form.getValues();
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Passo 4: Resumo da Prova</CardTitle>
                        <CardDescription>Confira todos os dados antes de salvar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2 p-4 border rounded-lg">
                           <h4 className="font-bold text-lg">{formData.title}</h4>
                           <p><span className="font-semibold">Disciplina/Turma:</span> {formData.subject}</p>
                           <p><span className="font-semibold">Data:</span> {format(formData.date, 'PPP', { locale: ptBR })}</p>
                           <p><span className="font-semibold">Total de Questões:</span> {formData.questions.length}</p>
                        </div>
                        <div className="space-y-4">
                             <h4 className="font-bold">Questões:</h4>
                             {formData.questions.map((q, i) => (
                                 <div key={q.id} className="p-3 border rounded-md bg-muted/40">
                                     <p className="font-semibold">Questão {i+1} (Peso: {q.weight}) - <span className="capitalize text-primary">{q.type}</span></p>
                                     <p className="text-sm mt-1 whitespace-pre-wrap">{q.statement}</p>
                                      <p className="text-sm mt-2 text-green-700 font-bold">Gabarito: {q.answerKey} {q.type === 'numeric' && q.margin ? `(±${q.margin})` : ''}</p>
                                 </div>
                             ))}
                        </div>
                        <Button type="button" variant="outline" className="w-full">
                           <FileCheck2 className="mr-2"/>
                            Gerar gabarito PDF (Em breve)
                        </Button>
                    </CardContent>
                </Card>
            );
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {renderStepContent()}
            <div className="flex justify-between mt-8">
              {currentStep > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2" />
                  Voltar
                </Button>
              ) : <div></div>}
              
              {currentStep < 3 ? (
                 <Button type="button" onClick={nextStep}>
                   Avançar <ArrowRight className="ml-2" />
                 </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="animate-spin mr-2" /> : <Save className="mr-2" />}
                  {existingExam ? 'Salvar Alterações' : 'Salvar Prova'}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </main>
    </div>
  );
}

// Add uuid dependency if not already present
// npm install uuid @types/uuid
// Since we can't run npm install, let's assume it's available.
// If not, we might need to add it to package.json
