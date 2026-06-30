import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { useUIStore } from '../../store/uiStore';
import {
  Brain,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  Menu,
  ChevronLeft,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '../ui/Button.tsx';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, sidebarCollapsed, toggleTheme, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Aplica o tema correto no elemento HTML ao carregar a página
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Cadernos', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-dark-950 dark:text-dark-50 transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-dark-900 border-r border-slate-100 dark:border-dark-800/80 flex flex-col transition-all duration-300 relative z-20 ${sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Header da Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50 dark:border-dark-800/60">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden select-none">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
              <Brain className="h-6 w-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-heading font-extrabold text-lg tracking-tight whitespace-nowrap">
                StudyNotes <span className="text-brand-500">Flash</span>
              </span>
            )}
          </Link>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-grow py-6 px-3 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium transition-all duration-200 select-none ${isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-650 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800/60'
                  }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer da Sidebar (Configurações / Modo Escuro / Usuário) */}
        <div className="p-3 border-t border-slate-50 dark:border-dark-800/60 flex flex-col gap-2">
          {/* Botão de alternar tema */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start py-2.5"
            leftIcon={theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          >
            {!sidebarCollapsed && (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro')}
          </Button>

          {/* Dados do usuário */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-dark-950/60 overflow-hidden">
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
          </div>

          {/* Botão de Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 py-2.5"
            leftIcon={<LogOut className="h-5 w-5" />}
          >
            {!sidebarCollapsed && 'Sair da conta'}
          </Button>
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-dark-900 border-b border-slate-150 dark:border-dark-800/80 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-200"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-dark-50">
              Painel de Estudos
            </h2>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-grow overflow-y-auto relative p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default AppLayout;
