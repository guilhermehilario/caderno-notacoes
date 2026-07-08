import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginSchema } from '../types';
import type { LoginInput } from '../types';
import { Input } from '../../../components/ui/Input.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { ApiErrorAlert } from '../../../components/ui/ApiErrorAlert.tsx';
import { extractApiError } from '../../../utils/api-errors.ts';
import { AuthLayout } from '../AuthLayout.tsx';

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
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      setApiError(extractApiError(error, 'E-mail ou senha incorretos. Tente novamente.'));
    }
  };

  return (
    <AuthLayout
      title="Entrar na sua conta"
      subtitle=""
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link
            to="/register"
            className="font-bold text-brand-500 hover:text-brand-600 transition-colors"
          >
            Criar conta gratuitamente
          </Link>
        </>
      }
    >
      <ApiErrorAlert message={apiError} />

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
            {/* Funcionalidade de recuperação de senha não implementada ainda */}
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
    </AuthLayout>
  );
};

export default LoginView;
