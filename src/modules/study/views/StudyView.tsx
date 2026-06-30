import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, Brain, Eye, HelpCircle } from 'lucide-react';
import { useNotebookFlashcards, useSubmitCardScore } from '../hooks/useFlashcards';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { Flashcard, StudyScore } from '../types';

export const StudyView: React.FC = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();

  // DEBUG: captura em sessionStorage (sobrevive a hard reload)
  const debugLog = (event: string, data: any) => {
    const key = 'studyview_debug';
    const prev = JSON.parse(sessionStorage.getItem(key) || '[]');
    prev.push({ t: Date.now(), event, data });
    if (prev.length > 100) prev.splice(0, prev.length - 100);
    sessionStorage.setItem(key, JSON.stringify(prev));
  };

  // Salva no beforeunload (caso a página reload)
  useEffect(() => {
    const handleBeforeUnload = () => debugLog('beforeunload', { reason: 'page reloading' });
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  debugLog('render', { currentIndex: 0 }); // valor inicial

  const { data: serverFlashcards = [], isLoading } = useNotebookFlashcards(notebookId || '');
  const { mutateAsync: submitScore } = useSubmitCardScore(undefined, notebookId);

  // 💡 O SEGREDO: Criamos uma cópia estática da fila assim que os cards carregam.
  // Isso impede que atualizações do React Query alterem a ordem ou removam cards enquanto você estuda.
  const [frozenFlashcards, setFrozenFlashcards] = useState<Flashcard[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Sincroniza os cards do servidor apenas uma vez na inicialização via useEffect
  // (evita render-phase state updates que podem conflitar com Strict Mode do React 19)
  // Usamos useRef como guard para evitar o ciclo: setHasInitialized → re-render → effect dispara de novo
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && serverFlashcards.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setFrozenFlashcards(serverFlashcards);
      setHasInitialized(true);
    }
  }, [isLoading, serverFlashcards]);

  // Passamos a ler tudo do nosso array congelado localmente
  const flashcards = frozenFlashcards.length > 0 ? frozenFlashcards : serverFlashcards;
  const currentCard = flashcards[currentIndex];

  const handleScoreSelect = async (score: StudyScore) => {
    if (!currentCard) {
      debugLog('abort', { reason: 'currentCard undefined', currentIndex });
      return;
    }

    const isLastCard = currentIndex >= flashcards.length - 1;
    const cardIdToSubmit = currentCard.id;

    debugLog('score-click', { currentIndex, cardIdToSubmit, score, isLastCard });

    setReviewedCount((prev) => prev + 1);

    if (!isLastCard) {
      setShowAnswer(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionFinished(true);
    }

    try {
      debugLog('submit-before', { cardIdToSubmit, score });
      await submitScore({ cardId: cardIdToSubmit, score });
      debugLog('submit-success', { cardIdToSubmit, score });
    } catch (error: any) {
      debugLog('submit-error', { message: error?.message, status: error?.response?.status });
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <RefreshCw className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  // Caso não existam flashcards para revisar
  if (flashcards.length === 0 && !sessionFinished) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center p-8 gap-5 mt-10">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 shadow-md">
          <CheckCircle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800 dark:text-dark-50">
            Tudo revisado!
          </h2>
          <p className="text-slate-500 dark:text-dark-350 text-sm mt-2">
            Não existem flashcards agendados para revisão hoje neste caderno. Excelente trabalho!
          </p>
        </div>
        <div className="flex gap-3 mt-2 w-full">
          <Button variant="outline" onClick={() => navigate(`/notebooks/${notebookId}`)} className="flex-1">
            Voltar ao Caderno
          </Button>
        </div>
      </div>
    );
  }

  if (sessionFinished) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center p-8 gap-5 mt-10">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500 shadow-md">
          <Brain className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-850 dark:text-dark-50">
            Sessão Concluída!
          </h2>
          <p className="text-slate-500 dark:text-dark-350 text-sm mt-2">
            Parabéns! Você revisou <span className="font-bold text-slate-800 dark:text-dark-100">{reviewedCount}</span> flashcards. Mantenha a consistência de estudos diária!
          </p>
        </div>
        <div className="flex flex-col gap-3 mt-4 w-full">
          <Button onClick={() => navigate(`/notebooks/${notebookId}`)} className="w-full">
            Voltar ao Caderno
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentIndex(0);
              setShowAnswer(false);
              setSessionFinished(false);
              setReviewedCount(0);
            }}
            className="w-full"
          >
            Estudar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // Barra de progresso da sessão
  const progressPercent = ((currentIndex) / flashcards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/notebooks/${notebookId}`}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Parar Revisão
        </Link>
        <span className="text-sm font-bold text-slate-450 dark:text-dark-400">
          Card {currentIndex + 1} de {flashcards.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 dark:bg-dark-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Interactive Card */}
      <Card className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 shadow-md relative overflow-hidden">
        {/* Marca d'água no fundo */}
        <div className="absolute right-4 bottom-4 text-slate-100 dark:text-dark-950 pointer-events-none">
          <Brain className="h-28 w-28 opacity-10" />
        </div>

        <div className="w-full max-w-lg flex flex-col gap-6 items-center">
          {!showAnswer ? (
            <>
              <div className="flex items-center gap-1.5 text-brand-500 text-xs font-bold tracking-wider uppercase">
                <HelpCircle className="h-4 w-4" /> Pergunta de Revisão
              </div>
              <p className="text-xl md:text-2xl font-heading font-semibold text-slate-800 dark:text-dark-50 leading-relaxed">
                {currentCard?.front}
              </p>
              <Button
                onClick={() => setShowAnswer(true)}
                leftIcon={<Eye className="h-4.5 w-4.5" />}
                className="mt-6 shadow-md"
              >
                Revelar Resposta
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold tracking-wider uppercase animate-fade-in">
                <CheckCircle className="h-4 w-4" /> Resposta Correta
              </div>
              <p className="text-lg md:text-xl text-slate-700 dark:text-dark-100 leading-relaxed animate-fade-in">
                {currentCard?.back}
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Rating Buttons - Show only when answer is revealed */}
      {showAnswer && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-250">
          <p className="text-xs font-bold text-center text-slate-400 dark:text-dark-400 uppercase tracking-wide">
            Como foi sua facilidade para lembrar do conteúdo?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { score: 0 as StudyScore, label: '0', title: 'Errei feio', color: 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400' },
              { score: 1 as StudyScore, label: '1', title: 'Errei', color: 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/10 dark:text-rose-300' },
              { score: 2 as StudyScore, label: '2', title: 'Hesitei', color: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400' },
              { score: 3 as StudyScore, label: '3', title: 'Dificuldade', color: 'bg-amber-50 border-amber-100 text-amber-500 hover:bg-amber-100 dark:bg-amber-950/10 dark:text-amber-300' },
              { score: 4 as StudyScore, label: '4', title: 'Lembrei', color: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-350' },
              { score: 5 as StudyScore, label: '5', title: 'Excelente', color: 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500' },
            ].map((btn) => (
              <button
                key={btn.score}
                onClick={() => handleScoreSelect(btn.score)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border font-bold text-center text-sm transition-all duration-200 hover:scale-[1.04] cursor-pointer ${btn.color}`}
                title={btn.title}
              >
                <span>{btn.label}</span>
                <span className="text-[10px] font-medium opacity-80 truncate max-w-full">
                  {btn.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default StudyView;
