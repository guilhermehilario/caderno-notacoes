import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { RegisterSchema } from '../types';
import type { RegisterInput } from '../types';
import { Input } from '../../../components/ui/Input.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';

export const RegisterView: React.FC = () => {
  const { register: registerUser, isRegistering } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setApiError(null);
    try {
      await registerUser(data);
      navigate('/dashboard');
    } catch (error: any) {
      setApiError(
        error.response?.data?.message || 'Erro ao criar conta. Tente novamente mais tarde.'
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
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25 mb-3 transition-transform hover:scale-105 duration-300">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 dark:text-dark-50 tracking-tight m-0">
            StudyNotes <span className="text-brand-500">AI</span>
          </h1>
          <p className="text-slate-500 dark:text-dark-300 mt-2 text-center text-sm font-medium">
            Seu copiloto inteligente para resumos e flashcards
          </p>
        </div>

        {/* Card de Cadastro */}
        <Card className="glass shadow-2xl p-8 border border-white/20 dark:border-white/5 rounded-3xl">
          <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-dark-50 mb-5">
            Crie sua conta
          </h2>

          {apiError && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Nome Completo"
              type="text"
              placeholder="Como quer ser chamado?"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="exemplo@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Senha"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirmação de Senha"
              type="password"
              placeholder="Repita sua senha"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isRegistering}>
              Criar Conta
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-dark-300">
            Já possui uma conta?{' '}
            <Link
              to="/login"
              className="font-bold text-brand-500 hover:text-brand-600 transition-colors"
            >
              Fazer login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default RegisterView;
