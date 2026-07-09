import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertTriangle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import { Button } from '../../../components/ui/Button.tsx';
import { ApiErrorAlert } from '../../../components/ui/ApiErrorAlert.tsx';
import { AuthLayout } from '../AuthLayout.tsx';
import { extractApiError } from '../../../utils/api-errors.ts';

type VerificationStep =
  | 'check-email'     // Após registro: mostra "verifique seu email"
  | 'verifying'       // Token presente na URL, verificando
  | 'success'         // Verificado com sucesso
  | 'expired'         // Token expirado
  | 'error';          // Erro na verificação

export const VerifyEmailView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const emailFromRegister = searchParams.get('email');

  const [step, setStep] = React.useState<VerificationStep>(
    token ? 'verifying' : 'check-email',
  );
  const [message, setMessage] = React.useState<string>('');
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resendEmail, setResendEmail] = React.useState(emailFromRegister || '');
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  // Verifica o token na inicialização
  React.useEffect(() => {
    if (token && step === 'verifying') {
      verifyToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    try {
      const result = await authService.verifyEmail(verificationToken);
      setMessage(result.message);
      setStep('success');
    } catch (error) {
      const errorMsg = extractApiError(error, '');
      if (
        errorMsg.toLowerCase().includes('expirado') ||
        errorMsg.toLowerCase().includes('inválido')
      ) {
        setStep('expired');
        setMessage(errorMsg);
      } else {
        setStep('error');
        setApiError(errorMsg);
      }
    }
  };

  const handleResend = async () => {
    if (!resendEmail) return;
    setIsResending(true);
    setApiError(null);
    setResendMessage(null);
    try {
      const result = await authService.resendVerification(resendEmail);
      setResendMessage(result.message);
    } catch (error) {
      setApiError(extractApiError(error, 'Erro ao reenviar e-mail.'));
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'verifying':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 text-brand-500 animate-spin" />
            <p className="text-slate-600 dark:text-dark-300 text-center">
              Verificando seu e-mail...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-dark-50">
                E-mail Verificado!
              </h3>
              <p className="text-slate-600 dark:text-dark-300 text-sm mt-1">
                Sua conta foi verificada com sucesso.
              </p>
            </div>
            <Button
              onClick={() => navigate('/login')}
              className="mt-2"
            >
              Fazer Login
            </Button>
          </div>
        );

      case 'expired':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-dark-50">
                Link Expirado
              </h3>
              <p className="text-slate-600 dark:text-dark-300 text-sm mt-1">
                {message || 'Este link de verificação expirou.'}
              </p>
              <p className="text-slate-500 dark:text-dark-400 text-xs mt-2">
                Solicite um novo link informando seu e-mail abaixo.
              </p>
            </div>

            <div className="w-full mt-4 space-y-3">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Seu e-mail cadastrado"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-slate-900 dark:text-dark-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              {resendMessage && (
                <p className="text-green-600 dark:text-green-400 text-xs text-center">
                  {resendMessage}
                </p>
              )}
              <Button
                onClick={handleResend}
                isLoading={isResending}
                className="w-full"
                variant="secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reenviar Link
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-dark-50">
                Erro na Verificação
              </h3>
              <ApiErrorAlert message={apiError} />
            </div>
            <Link
              to="/login"
              className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        );

      case 'check-email':
      default:
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Mail className="h-10 w-10 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-dark-50">
                Verifique seu E-mail
              </h3>
              <p className="text-slate-600 dark:text-dark-300 text-sm mt-1">
                Enviamos um link de confirmação para{' '}
                <strong className="text-slate-900 dark:text-dark-50">
                  {emailFromRegister || 'seu e-mail'}
                </strong>
                .
              </p>
              <p className="text-slate-500 dark:text-dark-400 text-xs mt-2">
                Clique no link recebido para ativar sua conta. Não esqueça de verificar a
                caixa de spam se não encontrar o e-mail.
              </p>
            </div>

            <div className="w-full mt-4 space-y-3">
              {resendMessage && (
                <p className="text-green-600 dark:text-green-400 text-xs text-center">
                  {resendMessage}
                </p>
              )}
              <Button
                onClick={handleResend}
                isLoading={isResending}
                className="w-full"
                variant="secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reenviar E-mail
              </Button>

              <Link
                to="/login"
                className="block text-center text-sm text-slate-500 dark:text-dark-400 hover:text-slate-700 dark:hover:text-dark-200 mt-2"
              >
                Voltar para o login
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <AuthLayout
      title="Confirmação de E-mail"
      subtitle=""
      footer={
        <Link
          to="/login"
          className="text-sm text-slate-500 dark:text-dark-400 hover:text-slate-700 dark:hover:text-dark-200"
        >
          Ir para o login
        </Link>
      }
    >
      {renderContent()}
    </AuthLayout>
  );
};

export default VerifyEmailView;
