import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  Timeline,
  Target,
  Timer,
  ListChecks,
} from 'lucide-react';
import { AgendaTab } from '../components/AgendaTab.tsx';
import { CalendarTab } from '../components/CalendarTab.tsx';
import { CronogramaTab } from '../components/CronogramaTab.tsx';
import { MetasTab } from '../components/MetasTab.tsx';
import { PomodoroTab } from '../components/PomodoroTab.tsx';

type TabKey = 'agenda' | 'calendar' | 'cronograma' | 'metas' | 'pomodoro';

const TAB_INFO: Record<TabKey, { label: string; icon: React.FC<{ className?: string }> }> = {
  agenda: { label: 'Agenda', icon: ListChecks },
  calendar: { label: 'Calendário', icon: CalendarDays },
  cronograma: { label: 'Cronograma', icon: Timeline },
  metas: { label: 'Metas', icon: Target },
  pomodoro: { label: 'Pomodoro', icon: Timer },
};

const TAB_COMPONENTS: Record<TabKey, React.FC> = {
  agenda: AgendaTab,
  calendar: CalendarTab,
  cronograma: CronogramaTab,
  metas: MetasTab,
  pomodoro: PomodoroTab,
};

export const PlanningView: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = (tab as TabKey) || 'agenda';

  // Validate tab — redirect to agenda if invalid
  if (!TAB_INFO[activeTab]) {
    return <Navigate to="/planning/agenda" replace />;
  }

  const tabMeta = TAB_INFO[activeTab];
  const Icon = tabMeta.icon;
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center text-violet-500 flex-shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-dark-50 flex items-center gap-3">
              Planejamento
              <span className="text-lg font-semibold text-slate-400 dark:text-dark-400 flex items-center gap-1.5">
                <Icon className="h-5 w-5" />
                {tabMeta.label}
              </span>
            </h1>
            <p className="text-slate-500 dark:text-dark-350 mt-0.5">
              Organize seus estudos com agenda, cronograma, metas e pomodoro
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[60vh]">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default PlanningView;
