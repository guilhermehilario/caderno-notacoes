import React, { useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Brain,
  ClipboardList,
  CheckCircle,
  Eye,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import studiesService from "../services/studiesService";
import { useSubmitCardScore } from "../hooks/useFlashcards";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { ScoreButtons } from "../components/ScoreButtons";
import type { Flashcard, StudyScore } from "../types";

type ReviewItemType = "flashcard" | "question";

interface ReviewItem {
  type: ReviewItemType;
  data: Flashcard | { id: string; question: string; correctAnswer: string; options: string; explanation: string | null };
}

export const ReviewsStudyView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notebookId = searchParams.get("notebookId");

  const { data: studyContent, isLoading } = useQuery({
    queryKey: ["studies", "content", notebookId || "all"],
    queryFn: () => studiesService.getContent(notebookId || undefined),
    staleTime: 30_000,
  });

  const { mutateAsync: submitScore } = useSubmitCardScore(undefined, notebookId || undefined);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [reviewCards, setReviewCards] = useState<ReviewItem[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const startSession = useCallback(() => {
    if (!studyContent) return;

    const items: ReviewItem[] = [];

    // Add due flashcards
    studyContent.flashcardsDue.forEach((fc) => {
      items.push({ type: "flashcard", data: fc });
    });

    // Add questions (up to 10)
    studyContent.questions.slice(0, 10).forEach((q) => {
      items.push({ type: "question", data: q });
    });

    // Shuffle
    const shuffled = items.sort(() => Math.random() - 0.5);
    setReviewCards(shuffled);
    setSessionStarted(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setSessionFinished(false);
    setCorrectCount(0);
  }, [studyContent]);

  const currentItem = reviewCards[currentIndex];
  const isLastItem = currentIndex >= reviewCards.length - 1;
  const totalItems = reviewCards.length;

  const handleNext = useCallback(async () => {
    if (!currentItem) return;

    if (currentItem.type === "flashcard") {
      // Flashcard: show answer first, then score
      if (!showResult) {
        setShowResult(true);
        return;
      }
    }

    if (currentItem.type === "question" && selectedOption) {
      const isCorrect = selectedOption === (currentItem.data as any).correctAnswer;
      if (isCorrect) setCorrectCount((prev) => prev + 1);
    }

    if (isLastItem) {
      setSessionFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setShowResult(false);
  }, [currentItem, showResult, selectedOption, isLastItem]);

  const handleScoreSelect = useCallback(
    async (score: StudyScore, e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentItem || currentItem.type !== "flashcard") return;

      if (score >= 3) setCorrectCount((prev) => prev + 1);

      try {
        await submitScore({ cardId: (currentItem.data as Flashcard).id, score });
      } catch {
        // Silently fail
      }

      if (isLastItem) {
        setSessionFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setShowResult(false);
      }
    },
    [currentItem, isLastItem, submitScore]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <RefreshCw className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  // Initial screen
  if (!sessionStarted) {
    const totalItems =
      (studyContent?.flashcardsDue.length || 0) + Math.min(studyContent?.questions.length || 0, 10);

    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link
          to="/studies"
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Estudos
        </Link>

        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-rose-500 mb-3" />
          <h3 className="text-lg font-heading font-bold text-slate-800 dark:text-dark-50 mb-1">
            Revisão Geral
          </h3>
          <p className="text-sm text-slate-500 dark:text-dark-400 mb-2">
            Revisão combinada de flashcards pendentes e questões
          </p>
          {totalItems > 0 ? (
            <>
              <div className="flex items-center justify-center gap-6 my-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-500">
                    {studyContent?.flashcardsDue.length || 0}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-dark-500">Flashcards</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500">
                    {Math.min(studyContent?.questions.length || 0, 10)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-dark-500">Questões</p>
                </div>
              </div>
              <Button onClick={startSession} leftIcon={<Sparkles className="h-4 w-4" />}>
                Iniciar Revisão ({totalItems} itens)
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 dark:text-dark-500 mb-4">
                Nada para revisar no momento. Crie flashcards e questões para aparecerem aqui.
              </p>
              <Button onClick={() => navigate("/studies")}>Voltar</Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  // Session finished
  if (sessionFinished) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link
          to="/studies"
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Estudos
        </Link>

        <Card className="p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
          <h3 className="text-2xl font-heading font-bold text-slate-800 dark:text-dark-50 mb-2">
            Revisão Concluída!
          </h3>
          <p className="text-4xl font-bold text-brand-500 mb-1">
            {correctCount}/{totalItems}
          </p>
          <p className="text-sm text-slate-500 dark:text-dark-400 mb-6">
            {totalItems > 0 ? ((correctCount / totalItems) * 100).toFixed(0) : 0}% de aproveitamento
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={startSession} variant="secondary">
              Nova Revisão
            </Button>
            <Button onClick={() => navigate("/studies")}>
              Outro Estudo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // No items
  if (reviewCards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-dark-600 mb-3" />
          <h3 className="text-lg font-heading font-bold text-slate-800 dark:text-dark-50 mb-1">
            Nada para revisar
          </h3>
          <Button onClick={() => navigate("/studies")}>Voltar</Button>
        </Card>
      </div>
    );
  }

  if (!currentItem) return null;

  // Render flashcard
  if (currentItem.type === "flashcard") {
    const card = currentItem.data as Flashcard;
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSessionStarted(false)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Sair da Revisão
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-medium">
              Flashcard
            </span>
            <span className="text-sm font-bold text-slate-450 dark:text-dark-400">
              {currentIndex + 1}/{totalItems}
            </span>
          </div>
        </div>

        <Card className="min-h-[250px] flex flex-col items-center justify-center p-8 text-center">
          {!showResult ? (
            <>
              <div className="flex items-center gap-1.5 text-brand-500 text-xs font-bold tracking-wider uppercase mb-4">
                <HelpCircle className="h-4 w-4" /> Pergunta
              </div>
              <p className="text-xl font-heading font-semibold text-slate-800 dark:text-dark-50 leading-relaxed">
                {card.front}
              </p>
              <Button
                onClick={() => setShowResult(true)}
                leftIcon={<Eye className="h-4.5 w-4.5" />}
                className="mt-6 shadow-md"
              >
                Revelar Resposta
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold tracking-wider uppercase mb-4">
                <CheckCircle className="h-4 w-4" /> Resposta Correta
              </div>
              <p className="text-lg text-slate-700 dark:text-dark-100 leading-relaxed mb-6">
                {card.back}
              </p>
            </>
          )}
        </Card>

        {showResult && <ScoreButtons onScoreSelect={handleScoreSelect} />}
      </div>
    );
  }

  // Render question
  const question = currentItem.data as any;
  const options = safeParseOptions(question.options);

  function safeParseOptions(optionsStr: string): string[] {
    try {
      const parsed = JSON.parse(optionsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const isAnswerCorrect = selectedOption && selectedOption === question.correctAnswer;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSessionStarted(false)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Sair da Revisão
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">
            Questão
          </span>
          <span className="text-sm font-bold text-slate-450 dark:text-dark-400">
            {currentIndex + 1}/{totalItems}
          </span>
        </div>
      </div>

      <Card className="p-6">
        <p className="text-lg font-heading font-semibold text-slate-800 dark:text-dark-50 leading-relaxed mb-6">
          {question.question}
        </p>

        <div className="flex flex-col gap-2">
          {options.map((option: string, idx: number) => {
            const isSelected = selectedOption === option;
            let optionClass =
              "flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer";

            if (!selectedOption) {
              optionClass += " border-slate-200 dark:border-dark-700 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/10";
            } else if (isSelected && isAnswerCorrect) {
              optionClass += " border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300";
            } else if (isSelected && !isAnswerCorrect) {
              optionClass += " border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300";
            } else if (option === question.correctAnswer && selectedOption) {
              optionClass += " border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400";
            } else {
              optionClass += " border-slate-200 dark:border-dark-700 opacity-50";
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => !selectedOption && setSelectedOption(option)}
                className={optionClass}
                disabled={!!selectedOption}
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-dark-400 flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {selectedOption && question.explanation && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-dark-800/50 border border-slate-100 dark:border-dark-700">
            <p className="text-xs font-bold text-slate-500 dark:text-dark-400 mb-1">Explicação</p>
            <p className="text-sm text-slate-600 dark:text-dark-300">{question.explanation}</p>
          </div>
        )}

        {selectedOption && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleNext}>
              {isLastItem ? "Ver Resultado" : "Próximo"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReviewsStudyView;
