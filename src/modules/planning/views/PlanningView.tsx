import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
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

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-dark-350">
          Organize seus estudos com agenda, cronograma, metas e pomodoro
        </p>
      </div>

      {/* Content */}
      <div className="min-h-[60vh]">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default PlanningView;
