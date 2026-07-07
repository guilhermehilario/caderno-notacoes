import React, { useCallback } from "react";
import {
  Brain,
  BookCheck,
  Target,
  TrendingUp,
  Loader2,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useStudyStats } from "../hooks/useStudyStats";
import { Card } from "../../../components/ui/Card.tsx";
import { EmptyState } from "../../../components/ui/EmptyState.tsx";
import { StatCard } from "../../../components/ui/StatCard.tsx";
import { MiniProgressRing } from "../../../components/ui/MiniProgressRing.tsx";
import { ProgressBar } from "../../../components/ui/ProgressBar.tsx";

export const StudyProgressSummary: React.FC = () => {
  const { data: stats, isLoading, isFetching, refetch } = useStudyStats();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!stats || stats.totalCards === 0) {
    return (
      <Card className="p-5 bg-gradient-to-br from-slate-50 to-white dark:from-dark-900 dark:to-dark-950 border border-slate-100 dark:border-dark-800">
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Nenhum estudo registrado ainda"
          description="Gere flashcards em suas folhas de anotação para começar a estudar e acompanhar seu progresso aqui."
        />
      </Card>
    );
  }

  const reviewedPct =
    stats.totalCards > 0
      ? Math.round((stats.reviewedToday / stats.totalCards) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de atualização */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-semibold text-slate-500 dark:text-dark-400">
            {isFetching ? "Atualizando..." : "Resumo do progresso"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-500 dark:text-dark-400 dark:hover:text-brand-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer disabled:opacity-50"
          title="Atualizar estatísticas"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 transition-transform duration-300 ${
              isFetching ? "animate-spin text-brand-500" : ""
            }`}
          />
          Atualizar
        </button>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Brain className="h-5 w-5" />}
          label="Total de Cards"
          value={stats.totalCards}
          sublabel={`${stats.dueForReview} pendentes para revisão`}
          colorClass="text-brand-500"
          iconBgClass="bg-brand-50 dark:bg-brand-950/20"
        />

        <StatCard
          icon={<BookCheck className="h-5 w-5" />}
          label="Revisados Hoje"
          value={stats.reviewedToday}
          sublabel={
            reviewedPct > 0
              ? `${reviewedPct}% do total`
              : "Nenhum card revisado hoje"
          }
          colorClass="text-emerald-500"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/20"
        />

        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="A Revisar"
          value={stats.dueForReview}
          sublabel={
            stats.dueForReview > 0
              ? "Cards atrasados ou pendentes"
              : "Tudo em dia!"
          }
          colorClass="text-amber-500"
          iconBgClass="bg-amber-50 dark:bg-amber-950/20"
        />

        <div className="flex items-center gap-3.5 p-4 bg-white dark:bg-dark-900 rounded-2xl border border-slate-100 dark:border-dark-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 dark:hover:border-dark-700">
          <MiniProgressRing value={stats.accuracyRate} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400 dark:text-dark-400 uppercase tracking-wide truncate">
              Taxa de Acerto
            </p>
            <p className="text-xl font-heading font-extrabold text-slate-800 dark:text-dark-50 mt-0.5">
              {stats.accuracyRate}%
            </p>
            <p className="text-[11px] text-slate-400 dark:text-dark-500 mt-0.5 truncate">
              Baseado no algoritmo SM-2
            </p>
          </div>
        </div>
      </div>

      {/* Per-Notebook Breakdown */}
      {stats.perNotebook.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-bold text-slate-400 dark:text-dark-400 uppercase tracking-wide">
            Por Caderno
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.perNotebook.map((nb) => {
              const progress =
                nb.totalCards > 0
                  ? Math.round((nb.reviewedToday / nb.totalCards) * 100)
                  : 0;
              return (
                <div
                  key={nb.notebookId}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-100 dark:border-dark-800 hover:border-slate-200 dark:hover:border-dark-700 transition-all"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: nb.notebookColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-dark-200 truncate">
                      {nb.notebookTitle}
                    </p>
                    <ProgressBar
                      value={nb.reviewedToday}
                      max={nb.totalCards}
                      showLabel
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyProgressSummary;
