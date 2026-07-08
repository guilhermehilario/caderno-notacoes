import React, { useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useEditorStatusStore } from '../../store/editorStatusStore';
import { useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  ArrowLeft,
  Clock,
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
} from 'lucide-react';

const PAGE_CONFIG: Record<string, { title: string; icon: React.ComponentType<{ className?: string }>; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard, subtitle: 'Visão geral dos seus estudos' },
  '/study': { title: 'Estudar Flashcards', icon: GraduationCap, subtitle: 'Revise seus flashcards com repetição espaçada' },
  '/leaves/': { title: 'Editor de Anotação', icon: BookOpen, subtitle: 'Edite suas anotações' },
  '/tags': { title: 'Gerenciar Tags', icon: Tags, subtitle: 'Gerencie suas tags' },
  '/bookmarks': { title: 'Páginas Marcadas', icon: BookmarkIcon, subtitle: 'Acesse suas páginas favoritas' },
  '/trash': { title: 'Lixeira', icon: Trash2, subtitle: 'Itens excluídos aparecem aqui por 15 dias' },
  '/archived': { title: 'Arquivados', icon: Archive, subtitle: 'Folhas arquivadas' },
  '/todos': { title: 'Tarefas', icon: ListChecks, subtitle: 'Gerencie suas tarefas pendentes' },
};

const DEFAULT_PAGE = { title: 'Dashboard', icon: LayoutDashboard, subtitle: 'Gerencie suas anotações e estudos' };

export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useUIStore();
  const queryClient = useQueryClient();
  const editorStatus = useEditorStatusStore();

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

      {/* Editor Status Info */}
      {editorStatus.visible && (
        <div className="flex items-center gap-3 text-xs font-semibold">
          {editorStatus.lastUpdate && (
            <span className="flex items-center gap-1.5 text-slate-400 dark:text-dark-400">
              <Clock className="h-3.5 w-3.5" />
              {new Date(editorStatus.lastUpdate).toLocaleString('pt-BR')}
            </span>
          )}
          <SaveStatusIndicator status={editorStatus.saveStatus} />
        </div>
      )}
    </header>
  );
};

export default AppHeader;
