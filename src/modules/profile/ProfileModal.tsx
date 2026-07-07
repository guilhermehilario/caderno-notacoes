import React, { useState } from 'react';
import {
  User,
  Settings,
  Moon,
  Sun,
  Camera,
  Lock,
  Globe,
  Calendar,
  Clock,
  Check,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { useAuth } from '../auth/hooks/useAuth';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../core/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_STYLES = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'big-ears',
  'bottts',
  'fun-emoji',
  'lorelei',
  'micah',
  'notionists',
  'open-peeps',
  'personas',
  'thumbs',
] as const;

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    theme,
    language,
    dateFormat,
    timeFormat,
    toggleTheme,
    setLanguage,
    setDateFormat,
    setTimeFormat,
  } = useUIStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [name, setName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const avatarStyle = selectedAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
      await api.put('/auth/profile', { name, avatarUrl: avatarStyle });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaveMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(null);
        setShowPasswordForm(false);
      }, 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setPasswordError(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarSelect = (style: string) => {
    const seed = encodeURIComponent(name || 'user');
    setSelectedAvatar(`https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-dark-800/60 -mx-6 px-6 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 pb-4 px-4 font-heading font-bold text-sm tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700'
          }`}
        >
          <User className="h-4 w-4" /> Perfil
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 pb-4 px-4 font-heading font-bold text-sm tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700'
          }`}
        >
          <Settings className="h-4 w-4" /> Configurações
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="flex flex-col gap-6">
          {/* Avatar Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Camera className="h-4 w-4" /> Avatar
            </label>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center overflow-hidden border-2 border-brand-200 dark:border-brand-800">
                {selectedAvatar ? (
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-brand-500" />
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-dark-400">Escolha um estilo:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleAvatarSelect(style)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedAvatar.includes(style)
                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-dark-300 hover:border-brand-300'
                  }`}
                >
                  {style.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">E-mail</label>
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-dark-950/50 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-500 dark:text-dark-400 text-sm">
              {user?.email}
            </div>
          </div>

          {/* Save message */}
          {saveMessage && (
            <div className={`p-3 rounded-xl text-sm font-medium ${
              saveMessage.includes('sucesso')
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
            }`}>
              {saveMessage}
            </div>
          )}

          <Button onClick={handleSaveProfile} isLoading={saving} className="self-start">
            Salvar Alterações
          </Button>

          {/* Password Change */}
          <div className="border-t border-slate-100 dark:border-dark-800/60 pt-6">
            <button
              type="button"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-dark-300 hover:text-brand-500 transition-colors cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              {showPasswordForm ? 'Cancelar alteração de senha' : 'Alterar senha'}
            </button>

            {showPasswordForm && (
              <div className="flex flex-col gap-4 mt-4">
                <Input
                  label="Senha atual"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                />
                <Input
                  label="Nova senha"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />

                {passwordError && (
                  <p className="text-xs text-rose-500 font-medium">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-xs text-emerald-500 font-medium">{passwordSuccess}</p>
                )}

                <Button
                  variant="outline"
                  onClick={handleChangePassword}
                  isLoading={changingPassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  className="self-start"
                >
                  Alterar Senha
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col gap-6">
          {/* Theme */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Tema
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-dark-700 hover:border-slate-300'
                }`}
              >
                <Sun className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">Claro</span>
                {theme === 'light' && <Check className="h-4 w-4 text-brand-500 ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-dark-700 hover:border-slate-300'
                }`}
              >
                <Moon className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">Escuro</span>
                {theme === 'dark' && <Check className="h-4 w-4 text-brand-500 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Globe className="h-4 w-4" /> Idioma
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-900 dark:text-dark-50 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 cursor-pointer"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Date Format */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Formato de Data
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-900 dark:text-dark-50 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 cursor-pointer"
            >
              <option value="dd/MM/yyyy">31/12/2024</option>
              <option value="MM/dd/yyyy">12/31/2024</option>
              <option value="yyyy-MM-dd">2024-12-31</option>
            </select>
          </div>

          {/* Time Format */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Formato de Hora
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTimeFormat('24h')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  timeFormat === '24h'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-dark-700 hover:border-slate-300'
                }`}
              >
                <Clock className="h-5 w-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">24h</span>
                {timeFormat === '24h' && <Check className="h-4 w-4 text-brand-500 ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => setTimeFormat('12h')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  timeFormat === '12h'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-dark-700 hover:border-slate-300'
                }`}
              >
                <Clock className="h-5 w-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">12h (AM/PM)</span>
                {timeFormat === '12h' && <Check className="h-4 w-4 text-brand-500 ml-auto" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ProfileModal;
