import React, { useState } from 'react';
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

const TABS: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'agenda', label: 'Agenda', icon: ListChecks },
  { key: 'calendar', label: 'Calendário', icon: CalendarDays },
  { key: 'cronograma', label: 'Cronograma', icon: Timeline },
  { key: 'metas', label: 'Metas', icon: Target },
  { key: 'pomodoro', label: 'Pomodoro', icon: Timer },
];

export const PlanningView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('agenda');

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center text-violet-500 flex-shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-dark-50">
              Planejamento
            </h1>
            <p className="text-slate-500 dark:text-dark-350 mt-0.5">
              Organize seus estudos com agenda, cronograma, metas e pomodoro
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-dark-900 rounded-2xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-dark-800 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 dark:text-dark-400 hover:text-slate-700 dark:hover:text-dark-200 hover:bg-white/50 dark:hover:bg-dark-800/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'agenda' && <AgendaTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'cronograma' && <CronogramaTab />}
        {activeTab === 'metas' && <MetasTab />}
        {activeTab === 'pomodoro' && <PomodoroTab />}
      </div>
    </div>
  );
};

export default PlanningView;
