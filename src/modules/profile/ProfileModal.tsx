import React, { useState } from 'react';
import {
  User,
  Settings,
  Camera,
  Lock,
  LogOut,
  Check,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  Calendar,
  Clock,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { useAuth } from '../auth/hooks/useAuth';
import { api } from '../../core/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../store/uiStore';
import {
  AVATAR_CATEGORIES,
  getAvatarUrl,
} from './avatarCategories';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'settings';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
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

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (user?.avatarUrl) {
      for (const cat of AVATAR_CATEGORIES) {
        if (user.avatarUrl.includes(`/${cat.style}/`)) return cat.id;
      }
    }
    return 'adventurer';
  });
  const [selectedVariant, setSelectedVariant] = useState<string>(() => {
    if (user?.avatarUrl) {
      const match = user.avatarUrl.match(/seed=([^&]+)/);
      if (match) {
        const decodedSeed = decodeURIComponent(match[1]);
        for (const cat of AVATAR_CATEGORIES) {
          const found = cat.variants.find((v) => v.seed === decodedSeed);
          if (found) return found.id;
        }
      }
    }
    return 'adv-luna';
  });
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

  // Derive current category and variant
  const currentCategory = AVATAR_CATEGORIES.find((c) => c.id === selectedCategory) || AVATAR_CATEGORIES[0];
  const currentVariant = currentCategory.variants.find((v) => v.id === selectedVariant) || currentCategory.variants[0];
  const currentAvatarUrl = getAvatarUrl(currentCategory.style, currentVariant.seed);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const avatarUrl = getAvatarUrl(currentCategory.style, currentVariant.seed);
      await api.put('/auth/profile', { name, avatarUrl });
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

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleVariantSelect = (catId: string, variantId: string) => {
    setSelectedCategory(catId);
    setSelectedVariant(variantId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg" className="max-h-[90vh]">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-dark-800/60 -mx-6 px-6 mb-6 sticky top-0 bg-white dark:bg-dark-900 z-10 rounded-t-2xl">
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

      {/* ── CONTEÚDO: PERFIL ── */}
      {activeTab === 'profile' && (
        <div className="flex flex-col gap-7 max-h-[calc(90vh-12rem)] overflow-y-auto pr-1">
          {/* Mini preview do avatar atual */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center overflow-hidden border-2 border-brand-200 dark:border-brand-800 flex-shrink-0">
              <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 rounded-full ring-2 ring-white/50 dark:ring-dark-900/50" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-dark-50">
                {user?.name || 'Meu Perfil'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Avatar Selection - Categories Grid */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Camera className="h-4 w-4 text-brand-500" /> Escolher Avatar
            </label>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {AVATAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === cat.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 ring-1 ring-brand-200 dark:ring-brand-800'
                      : 'border-slate-100 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-600'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className={`text-xs font-bold ${
                    selectedCategory === cat.id
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-dark-300'
                  }`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-dark-500 ml-0.5">
                    {cat.variants.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Variants Grid - 20 avatars for the selected category */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
              {currentCategory.variants.map((variant) => {
                const isSelected = selectedVariant === variant.id;
                const url = getAvatarUrl(currentCategory.style, variant.seed);
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleVariantSelect(currentCategory.id, variant.id)}
                    className={`relative flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 ring-2 ring-brand-200 dark:ring-brand-800 scale-105'
                        : 'border-slate-100 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-600 hover:bg-slate-50 dark:hover:bg-dark-900'
                    }`}
                    title={variant.seed}
                  >
                    <div className={`w-10 h-10 rounded-lg overflow-hidden ${isSelected ? 'ring-2 ring-brand-300' : ''}`}>
                      <img src={url} alt={variant.seed} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-brand-500 flex items-center justify-center shadow-sm">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <span className="text-[8px] text-slate-400 dark:text-dark-500 truncate max-w-full">
                      {variant.seed}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* More categories collapsed */}
            <details className="group">
              <summary className="text-xs font-semibold text-brand-500 cursor-pointer hover:text-brand-600 transition-colors list-none flex items-center gap-1 py-1">
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                {AVATAR_CATEGORIES.length} categorias · {AVATAR_CATEGORIES.reduce((a, c) => a + c.variants.length, 0)} avatares no total
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 mt-2 p-3 bg-slate-50 dark:bg-dark-950/30 rounded-xl">
                {AVATAR_CATEGORIES.map((cat) => {
                  const previewUrl = getAvatarUrl(cat.style, cat.variants[0].seed);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.id); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all cursor-pointer text-left min-w-0 ${
                        selectedCategory === cat.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                          : 'border-transparent hover:bg-white dark:hover:bg-dark-800/60'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 bg-white dark:bg-dark-900">
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-dark-300 truncate">
                        {cat.icon} {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          </div>

          {/* Name */}
          <Input
            label="Nome de usuário"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />

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
              onClick={() => {
                setShowPasswordForm(!showPasswordForm);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-dark-300 hover:text-brand-500 transition-colors cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              {showPasswordForm ? 'Cancelar alteração de senha' : 'Alterar senha'}
            </button>

            {showPasswordForm && (
              <div className="flex flex-col gap-4 mt-4">
                <Input label="Senha atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Sua senha atual" />
                <Input label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <Input label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />

                {passwordError && <p className="text-xs text-rose-500 font-medium">{passwordError}</p>}
                {passwordSuccess && <p className="text-xs text-emerald-500 font-medium">{passwordSuccess}</p>}

                <Button variant="outline" onClick={handleChangePassword} isLoading={changingPassword} disabled={!currentPassword || !newPassword || !confirmPassword} className="self-start">
                  Alterar Senha
                </Button>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 dark:border-dark-800/60 pt-6 pb-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 dark:hover:border-rose-800/40 transition-all cursor-pointer text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Sair da conta</span>
                <p className="text-[10px] text-rose-400 dark:text-rose-500/70">Fazer logout do aplicativo</p>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-300 dark:text-rose-700" />
            </button>
          </div>
        </div>
      )}

      {/* ── CONTEÚDO: CONFIGURAÇÕES ── */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-8 max-h-[calc(90vh-12rem)] overflow-y-auto pr-1">
          {/* Tema */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-500" />} Tema
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
                  <Sun className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">Claro</span>
                  <p className="text-[10px] text-slate-400 dark:text-dark-500">Tema claro padrão</p>
                </div>
                {theme === 'light' && <Check className="h-4 w-4 text-brand-500" />}
              </button>
              <button
                type="button"
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center">
                  <Moon className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">Escuro</span>
                  <p className="text-[10px] text-slate-400 dark:text-dark-500">Tema escuro noturno</p>
                </div>
                {theme === 'dark' && <Check className="h-4 w-4 text-brand-500" />}
              </button>
            </div>
          </div>

          {/* Idioma */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-500" /> Idioma
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-900 dark:text-dark-50 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 cursor-pointer appearance-none"
              >
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="es">🇪🇸 Español</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Formato de Data */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" /> Formato de Data
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'dd/MM/yyyy', label: '31/12/2024', desc: 'Dia/Mês/Ano' },
                { value: 'MM/dd/yyyy', label: '12/31/2024', desc: 'Mês/Dia/Ano' },
                { value: 'yyyy-MM-dd', label: '2024-12-31', desc: 'Ano-Mês-Dia' },
              ].map((fmt) => (
                <button
                  key={fmt.value}
                  type="button"
                  onClick={() => setDateFormat(fmt.value)}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                    dateFormat === fmt.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                      : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">{fmt.label}</span>
                  <span className="text-[10px] text-slate-400 dark:text-dark-500">{fmt.desc}</span>
                  {dateFormat === fmt.value && <Check className="h-3.5 w-3.5 text-brand-500 mt-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Formato de Hora */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-dark-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Formato de Hora
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTimeFormat('24h')}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  timeFormat === '24h' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-dark-700 hover:border-slate-300'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-dark-800 flex items-center justify-center">
                  <span className="text-sm font-extrabold text-slate-600 dark:text-dark-200">24</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">24 horas</span>
                  <p className="text-[10px] text-slate-400 dark:text-dark-500">14:30</p>
                </div>
                {timeFormat === '24h' && <Check className="h-4 w-4 text-brand-500" />}
              </button>
              <button
                type="button"
                onClick={() => setTimeFormat('12h')}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  timeFormat === '12h' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-dark-700 hover:border-slate-300'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-dark-800 flex items-center justify-center">
                  <span className="text-sm font-extrabold text-slate-600 dark:text-dark-200">12</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-dark-200">12 horas</span>
                  <p className="text-[10px] text-slate-400 dark:text-dark-500">2:30 PM</p>
                </div>
                {timeFormat === '12h' && <Check className="h-4 w-4 text-brand-500" />}
              </button>
            </div>
          </div>
          <div className="pb-2" /> {/* spacer */}
        </div>
      )}
    </Modal>
  );
};

export default ProfileModal;
