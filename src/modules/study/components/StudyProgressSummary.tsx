import React from 'react';
import { Brain, BookCheck, Target, TrendingUp, Loader2, BarChart3 } from 'lucide-react';
import { useStudyStats } from '../hooks/useStudyStats';
import { Card } from '../../../components/ui/Card.tsx';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  colorClass: string;
  iconBgClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  sublabel,
  colorClass,
  iconBgClass,
}) => (
  <div className="flex items-center gap-3.5 p-4 bg-white dark:bg-dark-900 rounded-2xl border border-slate-100 dark:border-dark-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 dark:hover:border-dark-700">
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass}`}
    >
      <div className={colorClass}>{icon}</div>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-slate-400 dark:text-dark-400 uppercase tracking-wide truncate">
        {label}
      </p>
      <p className="text-xl font-heading font-extrabold text-slate-800 dark:text-dark-50 mt-0.5">
        {value}
      </p>
      {sublabel && (
        <p className="text-[11px] text-slate-400 dark:text-dark-500 mt-0.5 truncate">
          {sublabel}
        </p>
      )}
    </div>
  </div>
);

const MiniProgressRing: React.FC<{ value: number; size?: number }> = ({
  value,
  size = 44,
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color =
    value >= 70
      ? 'stroke-emerald-500'
      : value >= 40
        ? 'stroke-amber-500'
        : 'stroke-rose-500';

  return (
    <svg width={size} height={size} className="-rotate-90 flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="fill-none stroke-slate-100 dark:stroke-dark-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`fill-none ${color} transition-all duration-700 ease-out`}
      />
    </svg>
  );
};

export const StudyProgressSummary: React.FC = () => {
  const { data: stats, isLoading } = useStudyStats();

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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500 flex-shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-dark-100">
              Nenhum estudo registrado ainda
            </p>
            <p className="text-xs text-slate-500 dark:text-dark-350 mt-0.5">
              Gere flashcards em suas folhas de anotação para começar a estudar e acompanhar seu progresso aqui.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const reviewedPct =
    stats.totalCards > 0
      ? Math.round((stats.reviewedToday / stats.totalCards) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
          <TrendingUp className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-lg font-heading font-bold text-slate-800 dark:text-dark-50 m-0">
          Progresso dos Estudos
        </h2>
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
              : 'Nenhum card revisado hoje'
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
              ? 'Cards atrasados ou pendentes'
              : 'Tudo em dia!'
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
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-dark-400 flex-shrink-0">
                        {nb.reviewedToday}/{nb.totalCards}
                      </span>
                    </div>
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
