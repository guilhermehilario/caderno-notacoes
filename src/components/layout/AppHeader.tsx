import React, { useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useEditorStatusStore } from '../../store/editorStatusStore';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import {
  Menu,
  ArrowLeft,
  Clock,
  Bell,
  User as UserIcon,
} from 'lucide-react';
import { SaveStatusIndicator } from '../ui/SaveStatusIndicator.tsx';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  BookmarkIcon,
  Tags,
  Trash2,
  Archive,
  ListChecks,
  Calendar,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore.ts';
import { ProfileModal } from '../../modules/profile/ProfileModal.tsx';

const PAGE_CONFIG: Record<string, { title: string; icon: React.ComponentType<{ className?: string }>; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard, subtitle: 'Visão geral dos seus estudos' },
  '/study': { title: 'Estudar Flashcards', icon: GraduationCap, subtitle: 'Revise seus flashcards com repetição espaçada' },
  '/leaves/': { title: 'Editor de Anotação', icon: BookOpen, subtitle: 'Edite suas anotações' },
  '/tags': { title: 'Gerenciar Tags', icon: Tags, subtitle: 'Gerencie suas tags' },
  '/bookmarks': { title: 'Páginas Marcadas', icon: BookmarkIcon, subtitle: 'Acesse suas páginas favoritas' },
  '/trash': { title: 'Lixeira', icon: Trash2, subtitle: 'Itens excluídos aparecem aqui por 15 dias' },
  '/archived': { title: 'Arquivados', icon: Archive, subtitle: 'Folhas arquivadas' },
  '/todos': { title: 'Tarefas', icon: ListChecks, subtitle: 'Gerencie suas tarefas pendentes' },
  '/planning': { title: 'Planejamento', icon: Calendar, subtitle: 'Organize seus estudos' },
  '/studies': { title: 'Estudos', icon: GraduationCap, subtitle: 'Escolha como estudar hoje' },
};

const PLANNING_TAB_LABELS: Record<string, string> = {
  agenda: 'Agenda',
  calendar: 'Calendário',
  cronograma: 'Cronograma',
  metas: 'Metas',
  pomodoro: 'Pomodoro',
  settings: 'Configurações',
};

const DEFAULT_PAGE = { title: 'Dashboard', icon: LayoutDashboard, subtitle: 'Gerencie suas anotações e estudos' };

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hora';
  return `${hours} horas`;
}

export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useUIStore();
  const queryClient = useQueryClient();
  const editorStatus = useEditorStatusStore();
  const { user } = useAuth();
  const notificationCount = useNotificationStore((s) => s.count);
  const notifications = useNotificationStore((s) => s.notifications);
  const acknowledge = useNotificationStore((s) => s.acknowledge);
  const acknowledgeAll = useNotificationStore((s) => s.acknowledgeAll);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // Extrai IDs da rota para breadcrumbs
  const pathIds = useMemo(() => {
    const path = location.pathname;
    const nbMatch = path.match(/\/notebooks\/([^/]+)/);
    const lfMatch = path.match(/\/notebooks\/([^/]+)\/leaves\/([^/]+)/);
    return {
      notebookId: nbMatch?.[1] || null,
      leafId: lfMatch?.[2] || null,
    };
  }, [location.pathname]);

  // Busca os nomes reais do cache do React Query
  const notebookName = useMemo(() => {
    if (!pathIds.notebookId) return null;
    const cached = queryClient.getQueryData<{ title?: string }>(['notebooks', pathIds.notebookId]);
    return cached?.title ?? null;
  }, [pathIds.notebookId, queryClient]);

  const leafName = useMemo(() => {
    if (!pathIds.leafId) return null;
    const cached = queryClient.getQueryData<{ title?: string }>(['leaves', pathIds.leafId]);
    return cached?.title ?? null;
  }, [pathIds.leafId, queryClient]);

  // Breadcrumb navigation
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const parts: { label: string; path: string }[] = [];

    if (path === '/dashboard' || path === '/') return [];

    parts.push({ label: 'Dashboard', path: '/dashboard' });

    if (pathIds.notebookId) {
      parts.push({
        label: notebookName || 'Caderno',
        path: `/notebooks/${pathIds.notebookId}`,
      });
    }
    if (pathIds.leafId) {
      parts.push({
        label: leafName || 'Folha',
        path: `/notebooks/${pathIds.notebookId}/leaves/${pathIds.leafId}`,
      });
    }
    if (path.includes('/study')) parts.push({ label: 'Estudar', path });
    if (path.includes('/tags')) parts.push({ label: 'Tags', path: '/tags' });
    if (path.includes('/bookmarks')) parts.push({ label: 'Marcadores', path: '/bookmarks' });
    if (path.includes('/trash')) parts.push({ label: 'Lixeira', path: '/trash' });
    if (path.includes('/archived')) parts.push({ label: 'Arquivados', path: '/archived' });
    if (path.includes('/todos')) parts.push({ label: 'Tarefas', path: '/todos' });
    if (path.includes('/planning')) {
      // Extract tab name from URL like /planning/agenda
      const tabMatch = path.match(/\/planning\/(\w+)/);
      const tabLabel = tabMatch && PLANNING_TAB_LABELS[tabMatch[1]]
        ? PLANNING_TAB_LABELS[tabMatch[1]]
        : 'Planejamento';
      parts.push({ label: tabLabel, path });
    }
    if (path.includes('/studies')) {
      if (path === '/studies') parts.push({ label: 'Estudos', path: '/studies' });
      else if (path.includes('flashcards')) parts.push({ label: 'Flashcards', path: '/studies/flashcards' });
      else if (path.includes('questions')) parts.push({ label: 'Questões', path: '/studies/questions' });
      else if (path.includes('mock-exams')) parts.push({ label: 'Simulados', path: '/studies/mock-exams' });
      else if (path.includes('reviews')) parts.push({ label: 'Revisões', path: '/studies/reviews' });
    }

    return parts;
  }, [location.pathname, pathIds, notebookName, leafName]);

  // Título dinâmico do header
  const pageConfig = useMemo(() => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return PAGE_CONFIG['/dashboard'];
    if (path.includes('/study')) return PAGE_CONFIG['/study'];
    if (path.includes('/leaves/') || path.includes('/notebooks/')) return { ...PAGE_CONFIG['/leaves/'], subtitle: '' };
    if (path.includes('/tags')) return PAGE_CONFIG['/tags'];
    if (path.includes('/bookmarks')) return PAGE_CONFIG['/bookmarks'];
    if (path.includes('/trash')) return PAGE_CONFIG['/trash'];
    if (path.includes('/archived')) return PAGE_CONFIG['/archived'];
    if (path.includes('/todos')) return PAGE_CONFIG['/todos'];
    if (path.includes('/planning')) return PAGE_CONFIG['/planning'];
    if (path.includes('/studies')) return PAGE_CONFIG['/studies'];
    return DEFAULT_PAGE;
  }, [location.pathname]);

  const PageIcon = pageConfig.icon;

  return (
    <header className="h-16 bg-white dark:bg-dark-900 border-b border-slate-150 dark:border-dark-800/80 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-200"
        >
          <Menu className="h-5 w-5" />
        </button>
        {breadcrumbs.length > 0 && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-200 transition-colors cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
            <PageIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-dark-50 leading-tight">
              {pageConfig.title}
            </h2>
            {breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-dark-400">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.path}>
                    {idx > 0 && <span className="text-slate-300 dark:text-dark-600">/</span>}
                    <Link
                      to={crumb.path}
                      className="hover:text-brand-500 transition-colors truncate max-w-[120px]"
                    >
                      {crumb.label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            ) : (
              <p className="text-xs text-slate-400 dark:text-dark-400 leading-tight hidden sm:block">
                {pageConfig.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right section: lastUpdate - notifications - profile */}
      <div className="flex items-center gap-2">
        {/* Editor Status Info (última atualização) */}
        {editorStatus.visible && (
          <div className="flex items-center gap-3 text-xs font-semibold mr-1">
            {editorStatus.lastUpdate && (
              <span className="flex items-center gap-1.5 text-slate-400 dark:text-dark-400 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5" />
                {new Date(editorStatus.lastUpdate).toLocaleString('pt-BR')}
              </span>
            )}
            <SaveStatusIndicator status={editorStatus.saveStatus} />
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-all cursor-pointer"
            title="Notificações"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-rose-500/30 animate-in zoom-in duration-200">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-dark-800">
                  <h4 className="text-sm font-heading font-bold text-slate-800 dark:text-dark-100">
                    Notificações
                  </h4>
                  {notifications.filter((n) => !n.acknowledged).length > 0 && (
                    <button
                      type="button"
                      onClick={acknowledgeAll}
                      className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors cursor-pointer"
                    >
                      Limpar todas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.filter((n) => !n.acknowledged).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <Bell className="h-8 w-8 text-slate-300 dark:text-dark-600 mb-2" />
                      <p className="text-sm text-slate-400 dark:text-dark-400">
                        Nenhuma notificação no momento
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications
                        .filter((n) => !n.acknowledged)
                        .sort((a, b) => b.notifiedAt - a.notifiedAt)
                        .map((notif) => (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => acknowledge(notif.id)}
                            className="flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-dark-800/60 transition-colors border-b border-slate-50 dark:border-dark-800/40 last:border-b-0 cursor-pointer"
                          >
                            <span className="text-lg flex-shrink-0 mt-0.5">
                              {notif.type === 'event' ? '📅' : notif.type === 'goal' ? '🎯' : '🍅'}
                            </span>
                            <div className="flex-grow min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-dark-100">
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-dark-350 mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-dark-500 flex-shrink-0">
                              {formatTimeAgo(notif.notifiedAt)}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-950/30">
                  <p className="text-[11px] text-slate-400 dark:text-dark-500 text-center">
                    As notificações são verificadas a cada 1 minuto
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Button */}
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-xl text-slate-500 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-all cursor-pointer group ml-1"
          title="Perfil"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 overflow-hidden flex-shrink-0 group-hover:ring-2 ring-brand-300 transition-all">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || "Avatar"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
          </div>
        </button>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};

export default AppHeader;
