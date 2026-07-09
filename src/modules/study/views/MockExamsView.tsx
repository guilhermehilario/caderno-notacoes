import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Timer,
  Clock,
  CheckCircle,
  Play,
  Plus,
  X,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMockExams, useDeleteMockExam } from "../hooks/useMockExams";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { EmptyState } from "../../../components/ui/EmptyState.tsx";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import type { MockExam, Question } from "../types";

export const MockExamsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notebookId = searchParams.get("notebookId");
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<MockExam | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examStep, setExamStep] = useState<"list" | "taking" | "result">("list");

  const { data: exams = [], isLoading } = useMockExams(notebookId || undefined);
  const deleteExam = useDeleteMockExam();

  const handleStartExam = (exam: MockExam) => {
    setActiveExam(exam);
    setExamAnswers({});
    setExamStep("taking");
  };

  const handleFinishExam = () => {
    setExamStep("result");
  };

  const handleBackToExams = () => {
    setActiveExam(null);
    setExamAnswers({});
    setExamStep("list");
  };

  const handleDeleteExam = async () => {
    if (examToDelete) {
      await deleteExam.mutateAsync(examToDelete);
      setExamToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <RefreshCw className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  // Taking an exam
  if (activeExam && examStep === "taking") {
    return (
      <ExamTakingView
        exam={activeExam}
        answers={examAnswers}
        setAnswers={setExamAnswers}
        onFinish={handleFinishExam}
        onBack={handleBackToExams}
      />
    );
  }

  // Exam result
  if (activeExam && examStep === "result") {
    return (
      <ExamResultView
        exam={activeExam}
        answers={examAnswers}
        onBack={() => {
          setActiveExam(null);
          setExamAnswers({});
          setExamStep("list");
        }}
        onRestart={() => {
          setExamAnswers({});
          setExamStep("taking");
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          to="/studies"
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Estudos
        </Link>
        <Button
          onClick={() => navigate("/studies")}
          variant="secondary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Novo Simulado
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-dark-50">
          Simulados
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">
          {notebookId ? "Simulados da matéria selecionada" : "Todos os simulados disponíveis"}
        </p>
      </div>

      {exams.length === 0 ? (
        <Card className="p-8 text-center">
          <Timer className="h-12 w-12 mx-auto text-slate-300 dark:text-dark-600 mb-3" />
          <h3 className="text-lg font-heading font-bold text-slate-800 dark:text-dark-50 mb-1">
            Nenhum simulado disponível
          </h3>
          <p className="text-sm text-slate-500 dark:text-dark-400 mb-4">
            Crie questões primeiro, depois gere um simulado automaticamente a partir delas.
          </p>
          <Button onClick={() => navigate("/studies")}>
            Voltar
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center flex-shrink-0">
                    <Timer className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-dark-50 truncate">
                      {exam.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400 dark:text-dark-500">
                        {exam._count?.questions || 0} questões
                      </span>
                      {exam.timeLimit && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-dark-500">
                          <Clock className="h-3 w-3" />
                          {exam.timeLimit} min
                        </span>
                      )}
                      {exam.notebook && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${exam.notebook.color}15`,
                            color: exam.notebook.color,
                          }}
                        >
                          {exam.notebook.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => handleStartExam(exam)}
                    leftIcon={<Play className="h-4 w-4" />}
                    size="sm"
                  >
                    Iniciar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setExamToDelete(exam.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleDeleteExam}
        title="Excluir Simulado"
        message="Tem certeza que deseja excluir este simulado? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleteExam.isPending}
      />
    </div>
  );
};

// ── Sub-componentes ──

interface ExamTakingViewProps {
  exam: MockExam;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onFinish: () => void;
  onBack: () => void;
}

const ExamTakingView: React.FC<ExamTakingViewProps> = ({
  exam,
  answers,
  setAnswers,
  onFinish,
  onBack,
}) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const questions = exam.questions?.map((eq) => eq.question) || [];
  const currentQuestion = questions[questionIndex];
  const isLast = questionIndex >= questions.length - 1;
  const answered = Object.keys(answers).length;

  const options = currentQuestion ? safeParseOptions(currentQuestion.options) : [];

  function safeParseOptions(optionsStr: string): string[] {
    try {
      const parsed = JSON.parse(optionsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const handleSelect = (option: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Card className="p-8 text-center">
          <p className="text-slate-500">Este simulado não possui questões.</p>
          <Button onClick={onBack} className="mt-4">Voltar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Sair do Simulado
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-dark-500">
          <Timer className="h-4 w-4" />
          {exam.timeLimit && <span>{exam.timeLimit} min</span>}
          <span className="ml-2 font-bold text-slate-600 dark:text-dark-300">
            {questionIndex + 1}/{questions.length}
          </span>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-100 dark:bg-dark-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${((answered) / questions.length) * 100}%` }}
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold tracking-wider uppercase mb-4">
          <HelpCircle className="h-4 w-4" /> Questão {questionIndex + 1}
        </div>
        <p className="text-lg font-heading font-semibold text-slate-800 dark:text-dark-50 leading-relaxed mb-6">
          {currentQuestion?.question}
        </p>

        <div className="flex flex-col gap-2">
          {options.map((option, idx) => {
            const isSelected = answers[currentQuestion?.id || ""] === option;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                    : "border-slate-200 dark:border-dark-700 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/10"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-dark-400 flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <span className="text-xs text-slate-400 dark:text-dark-500">
            {answered} de {questions.length} respondidas
          </span>
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion?.id || ""]}
          >
            {isLast ? "Finalizar" : "Próxima"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

const ExamResultView: React.FC<{
  exam: MockExam;
  answers: Record<string, string>;
  onBack: () => void;
  onRestart: () => void;
}> = ({ exam, answers, onBack, onRestart }) => {
  const questions = exam.questions?.map((eq) => eq.question) || [];
  const total = questions.length;
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctAnswer
  ).length;
  const percentage = total > 0 ? ((correctCount / total) * 100).toFixed(0) : "0";

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Card className="p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          {percentage >= "70" ? (
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          ) : (
            <Timer className="h-16 w-16 text-amber-500" />
          )}
        </div>
        <h3 className="text-2xl font-heading font-bold text-slate-800 dark:text-dark-50 mb-2">
          {exam.title} - Resultado
        </h3>
        <p className="text-4xl font-bold text-brand-500 mb-1">
          {correctCount}/{total}
        </p>
        <p className="text-sm text-slate-500 dark:text-dark-400 mb-6">
          {percentage}% de acerto
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={onBack} variant="secondary">
            Voltar
          </Button>
          <Button onClick={onRestart}>Refazer</Button>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = userAnswer === q.correctAnswer;
          return (
            <Card key={q.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className={`text-lg font-bold flex-shrink-0 ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isCorrect ? '✓' : '✗'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-dark-50">
                    {idx + 1}. {q.question}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">
                    Sua resposta: <span className={isCorrect ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>{userAnswer}</span>
                    {!isCorrect && (
                      <> · Correta: <span className="text-emerald-500 font-semibold">{q.correctAnswer}</span></>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MockExamsView;
