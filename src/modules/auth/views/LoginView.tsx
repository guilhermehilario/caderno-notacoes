import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LoginSchema } from '../types';
import type { LoginInput } from '../types';
import { Input } from '../../../components/ui/Input.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';

export const LoginView: React.FC = () => {
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error: any) {
      setApiError(
        error.response?.data?.message || 'E-mail ou senha incorretos. Tente novamente.'
      );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-100 via-slate-50 to-brand-50/30 dark:from-dark-950 dark:via-dark-900 dark:to-brand-950/10 p-4 transition-all duration-300">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-teal/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25 mb-3 transition-transform hover:scale-105 duration-300">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 dark:text-dark-50 tracking-tight m-0">
            StudyNotes <span className="text-brand-500">Flash</span>
          </h1>
          <p className="text-slate-500 dark:text-dark-300 mt-2 text-center text-sm font-medium">
            Seu copiloto inteligente para resumos e flashcards
          </p>
        </div>

        {/* Card de Form conteúdo */}
        <Card className="glass shadow-2xl p-8 border border-white/20 dark:border-white/5 rounded-3xl">
          <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-dark-50 mb-6">
            Entrar na sua conta
          </h2>

          {apiError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="E-mail"
              type="email"
              placeholder="exemplo@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Sua senha secreta"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoggingIn}>
              Entrar
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-dark-300">
            Ainda não tem conta?{' '}
            <Link
              to="/register"
              className="font-bold text-brand-500 hover:text-brand-600 transition-colors"
            >
              Criar conta gratuitamente
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default LoginView;
