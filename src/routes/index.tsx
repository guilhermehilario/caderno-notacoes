import { memo } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.tsx';
import PrivateRoute from './PrivateRoute.tsx';
import PublicRoute from './PublicRoute.tsx';
import LoginView from '../modules/auth/views/LoginView.tsx';
import RegisterView from '../modules/auth/views/RegisterView.tsx';
import DashboardView from '../modules/notebooks/views/DashboardView.tsx';
import NotebookView from '../modules/notebooks/views/NotebookView.tsx';
import EditorView from '../modules/leaves/views/EditorView.tsx';
import StudyView from '../modules/study/views/StudyView.tsx';
import TagsManagementView from '../modules/tags/views/TagsManagementView.tsx';
import BookmarksView from '../modules/bookmarks/views/BookmarksView.tsx';
import TrashView from '../modules/trash/views/TrashView.tsx';
import ArchivedLeavesView from '../modules/leaves/views/ArchivedLeavesView.tsx';
import TodoListView from '../modules/todos/views/TodoListView.tsx';
import PlanningView from '../modules/planning/views/PlanningView.tsx';

/* ─── Componentes nomeados e memoizados para cada rota ────────────── */

const LoginPage = memo(function LoginPage() {
  return (
    <PublicRoute>
      <LoginView />
    </PublicRoute>
  );
});

const RegisterPage = memo(function RegisterPage() {
  return (
    <PublicRoute>
      <RegisterView />
    </PublicRoute>
  );
});

const AppRoot = memo(function AppRoot() {
  return (
    <PrivateRoute>
      <AppLayout />
    </PrivateRoute>
  );
});

const DashboardPage = memo(function DashboardPage() {
  return <DashboardView />;
});

const NotebookDetailPage = memo(function NotebookDetailPage() {
  return <NotebookView />;
});

const LeafEditorPage = memo(function LeafEditorPage() {
  return <EditorView />;
});

const StudyPage = memo(function StudyPage() {
  return <StudyView />;
});

const TagsPage = memo(function TagsPage() {
  return <TagsManagementView />;
});

const BookmarksPage = memo(function BookmarksPage() {
  return <BookmarksView />;
});

const TrashPage = memo(function TrashPage() {
  return <TrashView />;
});

const ArchivedPage = memo(function ArchivedPage() {
  return <ArchivedLeavesView />;
});

const TodoListPage = memo(function TodoListPage() {
  return <TodoListView />;
});

const PlanningPage = memo(function PlanningPage() {
  return <PlanningView />;
});

const DefaultRedirect = memo(function DefaultRedirect() {
  return <Navigate to="/dashboard" replace />;
});

const CatchAllRedirect = memo(function CatchAllRedirect() {
  return <Navigate to="/dashboard" replace />;
});

/* ─── Router estático (fora de qualquer componente/função) ─────────── */

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <AppRoot />,
    children: [
      {
        path: '',
        element: <DefaultRedirect />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'notebooks/:notebookId',
        element: <NotebookDetailPage />,
      },
      {
        path: 'notebooks/:notebookId/leaves/:leafId',
        element: <LeafEditorPage />,
      },
      {
        path: 'notebooks/:notebookId/study',
        element: <StudyPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
      {
        path: 'bookmarks',
        element: <BookmarksPage />,
      },
      {
        path: 'trash',
        element: <TrashPage />,
      },
      {
        path: 'archived',
        element: <ArchivedPage />,
      },
      {
        path: 'todos',
        element: <TodoListPage />,
      },
      {
        path: 'planning',
        element: <PlanningPage />,
      },
    ],
  },
  {
    path: '*',
    element: <CatchAllRedirect />,
  },
]);

/* ─── Componente público que expõe o RouterProvider ───────────────── */

export function AppRoutes() {
  return <RouterProvider router={router} />;
}

export default AppRoutes;
