'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Camera, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

// Define the global cv object, which will be available after the script loads.
declare global {
  var cv: any;
}

export default function OmrPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detectedAnswers, setDetectedAnswers] = useState<string[]>([]);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isCvReady, setIsCvReady] = useState(false);
  const { toast } = useToast();
  
  const workerRef = useRef<Worker>();

  useEffect(() => {
    // Initialize the Web Worker
    workerRef.current = new Worker(new URL('../../workers/omr.worker.ts', import.meta.url));

    const onMessageFromWorker = (event: MessageEvent) => {
      const { type, payload } = event.data;
      setProcessing(false);
      if (type === 'SUCCESS') {
        setDetectedAnswers(payload);
        setIsResultModalOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro de Processamento',
          description: payload,
        });
      }
    };

    workerRef.current.addEventListener('message', onMessageFromWorker);
    
    return () => {
      workerRef.current?.removeEventListener('message', onMessageFromWorker);
      workerRef.current?.terminate();
    };
  }, [toast]);


  // Effect to handle OpenCV.js loading
  useEffect(() => {
    const checkCv = () => {
      if (window.cv) {
        setIsCvReady(true);
      } else {
        setTimeout(checkCv, 100);
      }
    };
    checkCv();
  }, []);
  
  // Effect to handle authentication redirection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Effect to request camera access
  useEffect(() => {
    const getCameraPermission = async () => {
      if (hasCameraPermission === null) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Acesso à câmera negado',
            description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
          });
        }
      }
    };
    getCameraPermission();
  }, [hasCameraPermission, toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);

        setProcessing(true);
        // Post message to the worker to process the image
        workerRef.current?.postMessage({
          imageDataUrl: imageDataUrl
        });
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDetectedAnswers([]);
    setIsResultModalOpen(false);
  };

  const handleAccept = () => {
     try {
      const drafts = JSON.parse(localStorage.getItem('omrDrafts') || '[]');
      drafts.push({ id: `draft-${Date.now()}`, answers: detectedAnswers, date: new Date().toISOString() });
      localStorage.setItem('omrDrafts', JSON.stringify(drafts));
      toast({
        title: 'Respostas salvas',
        description: 'As respostas foram salvas como um rascunho.',
      });
    } catch(e) {
       toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as respostas no armazenamento local.',
      });
    }
    handleRetake();
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
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-4">Correção de Prova</h1>
          <p className="text-muted-foreground mb-6">Aponte a câmera para a folha de respostas e capture a imagem.</p>

          <div className="relative w-full max-w-xl aspect-[1/1.414] border-2 border-dashed rounded-lg overflow-hidden mb-6">
            {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            ) : (
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            )}
            {!capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[90%] h-[95%] border-4 border-dashed border-primary/50 rounded-lg"/>
              </div>
            )}
            {processing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <LoaderCircle className="h-12 w-12 animate-spin text-white" />
                <p className="text-white mt-4">Processando...</p>
              </div>
            )}
          </div>
          
          {hasCameraPermission === false && (
            <Alert variant="destructive" className="w-full max-w-xl mb-4">
              <AlertTitle>Acesso à câmera necessário</AlertTitle>
              <AlertDescription>
                Por favor, permita o acesso à câmera para usar esta funcionalidade.
              </AlertDescription>
            </Alert>
          )}

          {!isCvReady && hasCameraPermission && (
             <Alert className="w-full max-w-xl mb-4">
              <LoaderCircle className="h-5 w-5 animate-spin mr-3"/>
              <AlertTitle>Carregando</AlertTitle>
              <AlertDescription>
                A biblioteca de processamento de imagem está sendo carregada.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            {capturedImage ? (
              <>
                <Button onClick={handleRetake} variant="outline" disabled={processing}>
                  <RefreshCw className="mr-2"/>
                  Refazer
                </Button>
              </>
            ) : (
              <Button onClick={handleCapture} disabled={!hasCameraPermission || !isCvReady || processing}>
                <Camera className="mr-2" />
                Capturar
              </Button>
            )}
          </div>
        </div>
      </main>

      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respostas Detectadas</DialogTitle>
            <DialogDescription>
              Confira a lista de respostas detectadas. Você pode aceitar ou refazer a captura.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto p-2 border rounded-md">
            <ol className="grid grid-cols-5 gap-2 list-inside">
              {detectedAnswers.map((answer, index) => (
                <li key={index} className="text-center font-mono p-1 rounded-md bg-muted">
                    <span className="font-bold text-sm mr-2">{index + 1}.</span>{answer}
                </li>
              ))}
            </ol>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleRetake}>Refazer</Button>
            <Button onClick={handleAccept}>
              <Check className="mr-2" />
              Aceitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
}
