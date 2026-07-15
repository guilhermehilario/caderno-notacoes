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
  const [isEmailNotVerified, setIsEmailNotVerified] = React.useState(false);

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
    setIsEmailNotVerified(false);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = extractApiError(error, 'E-mail ou senha incorretos. Tente novamente.');
      // Detecta erro específico de e-mail não verificado
      if (errorMsg.includes('EMAIL_NOT_VERIFIED')) {
        setIsEmailNotVerified(true);
        setApiError(
          'Seu e-mail ainda não foi verificado. Verifique sua caixa de entrada ou solicite um novo link.',
        );
      } else {
        setApiError(errorMsg);
      }
    }
  };

  return (
    <AuthLayout
      title="Entrar na sua conta"

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

      {isEmailNotVerified && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Clique no link enviado para seu e-mail para verificar sua conta.
          </p>
          <Link
            to="/verify-email"
            className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 underline underline-offset-2 mt-1 inline-block"
          >
            Reenviar link de verificação
          </Link>
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
              className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
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
    </AuthLayout>
  );
};

export default LoginView;
