import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import LoginView from '../modules/auth/views/LoginView';
import RegisterView from '../modules/auth/views/RegisterView';
import DashboardView from '../modules/notebooks/views/DashboardView';
import NotebookView from '../modules/notebooks/views/NotebookView';
import EditorView from '../modules/leaves/views/EditorView';
import StudyView from '../modules/study/views/StudyView';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginView />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterView />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardView />,
      },
      {
        path: 'notebooks/:notebookId',
        element: <NotebookView />,
      },
      {
        path: 'notebooks/:notebookId/leaves/:leafId',
        element: <EditorView />,
      },
      {
        path: 'notebooks/:notebookId/study',
        element: <StudyView />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
export default router;
