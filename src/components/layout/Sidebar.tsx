import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { useUIStore } from '../../store/uiStore';
import {
  Brain,
  LayoutDashboard,
  BookmarkIcon,
  Archive,
  Trash2,
  User as UserIcon,
  ChevronLeft,
} from 'lucide-react';
import { ProfileModal } from '../../modules/profile/ProfileModal.tsx';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bookmarks', label: 'Marcadores', icon: BookmarkIcon },
  { path: '/archived', label: 'Arquivados', icon: Archive },
] as const;

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isTrashActive = location.pathname.startsWith('/trash');

  return (
    <aside
      className={`bg-white dark:bg-dark-900 border-r border-slate-100 dark:border-dark-800/80 flex flex-col transition-all duration-300 relative z-20 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header da Sidebar */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-slate-50 dark:border-dark-800/60">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 overflow-hidden select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
            <Brain className="h-6 w-6 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-heading font-extrabold text-lg tracking-tight whitespace-nowrap">
              StudyNotes <span className="text-brand-500">AI</span>
            </span>
          )}
        </Link>
      </div>

      {/* Links de Navegação */}
      <nav className="flex-grow py-6 px-3 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium transition-all duration-200 select-none ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-650 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800/60'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer da Sidebar */}
      <div className="p-3 border-t border-slate-50 dark:border-dark-800/60 flex flex-col gap-2">
        {/* Botão Lixeira */}
        <Link
          to="/trash"
          className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium transition-all duration-200 select-none ${
            isTrashActive
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
              : 'text-slate-650 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800/60'
          }`}
        >
          <Trash2 className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Lixeira</span>}
        </Link>

        {/* Dados do usuário (clicável → abre modal de perfil) */}
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-dark-950/60 overflow-hidden hover:bg-slate-100 dark:hover:bg-dark-800/60 transition-colors cursor-pointer w-full text-left"
        >
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-grow overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-800 dark:text-dark-100">
                {user?.name || 'Estudante'}
              </p>
              <p className="text-xs truncate text-slate-400 dark:text-dark-400">
                {user?.email}
              </p>
            </div>
          )}
        </button>
      </div>

      {/* Toggle Collapse Button */}
      <button
        onClick={toggleSidebar}
        className="absolute bottom-20 right-[-14px] w-7 h-7 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-dark-700 cursor-pointer shadow-sm text-slate-600 dark:text-dark-200"
      >
        {sidebarCollapsed ? (
          <ChevronLeft className="h-4 w-4 rotate-180" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Profile/Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;
