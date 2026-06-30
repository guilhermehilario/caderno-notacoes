import React, { useState, useEffect, useRef, startTransition } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Brain,
  Eye,
  HelpCircle,
} from "lucide-react";
import {
  useNotebookFlashcards,
  useSubmitCardScore,
} from "../hooks/useFlashcards";
import { useStudyStore } from "../studyStore";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import type { Flashcard, StudyScore } from "../types";

export const StudyView: React.FC = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const nbId = notebookId ?? "";

  const { data: serverFlashcards = [], isLoading } =
    useNotebookFlashcards(nbId);
  const { mutateAsync: submitScore } = useSubmitCardScore(undefined, nbId);

  // ── Zustand Store ──
  // Selector único para estado da sessão (evita múltiplas inscrições)
  const sessionSlot = useStudyStore((s) => s.sessions[nbId]);
  // Ações separadas: são funções estáveis do Zustand, nunca causam re-render
  const setCurrentIndex = useStudyStore((s) => s.setCurrentIndex);
  const setReviewedCount = useStudyStore((s) => s.setReviewedCount);
  const setShowAnswer = useStudyStore((s) => s.setShowAnswer);
  const resetSession = useStudyStore((s) => s.resetSession);

  const currentIndex = sessionSlot?.currentIndex ?? 0;
  const reviewedCount = sessionSlot?.reviewedCount ?? 0;
  const showAnswer = sessionSlot?.showAnswer ?? false;

  // ── Estado local transitório (não afeta progresso) ──
  const [frozenFlashcards, setFrozenFlashcards] = useState<Flashcard[]>([]);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Ref que impede o congelamento dos flashcards mais de uma vez
  // dentro da mesma sessão (mesmo que o cache do React Query se atualize).
  const initializedRef = useRef(false);

  // ── Reset automático ao navegar entre notebooks ──────────────
  // Quando o usuário muda de notebook (ex.: /notebooks/abc/study → /xyz/study),
  // limpa os estados locais para começar do zero. A store do Zustand já isola
  // as sessões por nbId, portanto o progresso do notebook anterior fica preservado
  // caso o usuário retorne.
  useEffect(() => {
    initializedRef.current = false;
    startTransition(() => {
      setFrozenFlashcards([]);
      setSessionFinished(false);
    });
  }, [nbId]);

  // Congela a lista de flashcards assim que carrega, impedindo que
  // atualizações silenciosas do cache (React Query) alterem a ordem
  // ou removam cards durante a sessão.
  useEffect(() => {
    if (!isLoading && serverFlashcards.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      startTransition(() => {
        setFrozenFlashcards(serverFlashcards);
      });
    }
  }, [isLoading, serverFlashcards]);

  const flashcards =
    frozenFlashcards.length > 0 ? frozenFlashcards : serverFlashcards;
  const currentCard = flashcards[currentIndex];
  const progressPercent =
    flashcards.length > 0 ? (currentIndex / flashcards.length) * 100 : 0;

  const handleScoreSelect = async (
    score: StudyScore,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentCard) return;

    const isLastCard = currentIndex >= flashcards.length - 1;
    const cardIdToSubmit = currentCard.id;

    // ⚡ Atualiza os estados síncronos da Store IMEDIATAMENTE
    // (antes da mutação assíncrona) para que o avanço do card
    // seja instantâneo na UI.
    setReviewedCount(nbId, reviewedCount + 1);

    if (!isLastCard) {
      setShowAnswer(nbId, false);
      setCurrentIndex(nbId, currentIndex + 1);
    } else {
      setSessionFinished(true);
    }

    // Mutação assíncrona – não bloqueia a UI
    try {
      await submitScore({ cardId: cardIdToSubmit, score });
    } catch {
      // Falha silenciosa – o score será reenviado na próxima interação
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
            Não existem flashcards agendados para revisão hoje neste caderno.
            Excelente trabalho!
          </p>
        </div>
        <div className="flex gap-3 mt-2 w-full">
          <Button
            variant="outline"
            onClick={() => navigate(`/notebooks/${nbId}`)}
            className="flex-1"
          >
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
            Parabéns! Você revisou{" "}
            <span className="font-bold text-slate-800 dark:text-dark-100">
              {reviewedCount}
            </span>{" "}
            flashcards. Mantenha a consistência de estudos diária!
          </p>
        </div>
        <div className="flex flex-col gap-3 mt-4 w-full">
          <Button
            onClick={() => navigate(`/notebooks/${nbId}`)}
            className="w-full"
          >
            Voltar ao Caderno
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetSession(nbId);
              setSessionFinished(false);
            }}
            className="w-full"
          >
            Estudar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/notebooks/${nbId}`}
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
                onClick={() => setShowAnswer(nbId, true)}
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
            {(
              [
                {
                  score: 0 as StudyScore,
                  label: "0",
                  title: "Errei feio",
                  color:
                    "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400",
                },
                {
                  score: 1 as StudyScore,
                  label: "1",
                  title: "Errei",
                  color:
                    "bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/10 dark:text-rose-300",
                },
                {
                  score: 2 as StudyScore,
                  label: "2",
                  title: "Hesitei",
                  color:
                    "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400",
                },
                {
                  score: 3 as StudyScore,
                  label: "3",
                  title: "Dificuldade",
                  color:
                    "bg-amber-50 border-amber-100 text-amber-500 hover:bg-amber-100 dark:bg-amber-950/10 dark:text-amber-300",
                },
                {
                  score: 4 as StudyScore,
                  label: "4",
                  title: "Lembrei",
                  color:
                    "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-350",
                },
                {
                  score: 5 as StudyScore,
                  label: "5",
                  title: "Excelente",
                  color:
                    "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
                },
              ] as const
            ).map((btn) => (
              <button
                key={btn.score}
                type="button"
                onClick={(e) => handleScoreSelect(btn.score, e)}
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
