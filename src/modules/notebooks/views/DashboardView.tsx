import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, BookOpen, ChevronRight, Loader2, ChevronUp, ChevronDown, TrendingUp } from 'lucide-react';
import { useNotebooks } from '../hooks/useNotebooks';
import { CreateNotebookSchema } from '../types';
import type { CreateNotebookInput } from '../types';
import { Card } from '../../../components/ui/Card.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { TextArea } from '../../../components/ui/TextArea.tsx';
import { ColorPicker } from '../../../components/ui/ColorPicker.tsx';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { LoadingScreen } from '../../../components/ui/LoadingScreen.tsx';
import { StudyProgressSummary } from '../../../modules/study/components/StudyProgressSummary.tsx';
import { NOTEBOOK_COLORS } from '../../notebooks/constants';

export const DashboardView: React.FC = () => {
  const { notebooks, isLoading, createNotebook } = useNotebooks();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(NOTEBOOK_COLORS[0]);
  const [progressCollapsed, setProgressCollapsed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNotebookInput>({
    resolver: zodResolver(CreateNotebookSchema),
    defaultValues: {
      title: '',
      description: '',
      color: NOTEBOOK_COLORS[0],
    },
  });

  const onSubmit = async (data: CreateNotebookInput) => {
    try {
      await createNotebook({
        ...data,
        color: selectedColor,
      });
      setIsModalOpen(false);
      reset();
      setSelectedColor(NOTEBOOK_COLORS[0]);
    } catch (error) {
      console.error('Erro ao criar caderno:', error);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Study Progress Summary - Collapsible */}
      <div className="flex flex-col bg-white dark:bg-dark-900 rounded-3xl border border-slate-100 dark:border-dark-800 overflow-hidden transition-all duration-300">
        {/* Collapse Header */}
        <button
          type="button"
          onClick={() => setProgressCollapsed(!progressCollapsed)}
          className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-lg font-heading font-bold text-slate-800 dark:text-dark-50 m-0">
              Progresso dos Estudos
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-dark-400">
              {progressCollapsed ? 'Expandir' : 'Minimizar'}
            </span>
            {progressCollapsed ? (
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-300" />
            ) : (
              <ChevronUp className="h-4 w-4 text-slate-400 transition-transform duration-300" />
            )}
          </div>
        </button>

        {/* Progress Content with animation */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            progressCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
          }`}
        >
          <div className="px-6 pb-6">
            <StudyProgressSummary />
          </div>
        </div>
      </div>

      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight m-0 text-slate-900 dark:text-dark-50">
            Seus Cadernos
          </h1>
          <p className="text-slate-500 dark:text-dark-350 mt-1">
            Gerencie seus materiais universitários e crie resumos de forma organizada
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-5 w-5" />}
          className="shadow-md shadow-brand-500/10 self-start md:self-auto"
        >
          Novo Caderno
        </Button>
      </div>

      {/* Notebook Grid */}
      {notebooks.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="Nenhum caderno criado"
          description="Comece criando o seu primeiro caderno para separar suas disciplinas da faculdade."
          action={
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Criar meu primeiro caderno
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <Card
              key={notebook.id}
              hoverable
              onClick={() => navigate(`/notebooks/${notebook.id}`)}
              className="flex flex-col justify-between group h-52 relative overflow-hidden border border-slate-100 dark:border-dark-800"
            >
              {/* Color Tag Bar */}
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: notebook.color }}
              />

              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: notebook.color }}
                  />
                  <h3 className="text-lg font-heading font-bold truncate text-slate-800 dark:text-dark-50 group-hover:text-brand-500 transition-colors">
                    {notebook.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-dark-350 line-clamp-3">
                  {notebook.description || 'Nenhuma descrição adicionada.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 dark:border-dark-800/60 pt-4 text-xs font-semibold text-slate-400 dark:text-dark-400">
                <span>{notebook.leavesCount} folhas anotadas</span>
                <span className="flex items-center gap-1 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Acessar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Criar Novo Caderno"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>Criar Caderno</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Título do Caderno"
            placeholder="Ex: Engenharia de Software II, Cálculo III"
            error={errors.title?.message}
            {...register('title')}
          />

          <TextArea
            label="Descrição (Opcional)"
            placeholder="Uma breve descrição sobre este caderno..."
            rows={3}
            {...register('description')}
          />

          <ColorPicker
            colors={NOTEBOOK_COLORS}
            selectedColor={selectedColor}
            onChange={setSelectedColor}
            label="Cor de Identificação"
          />
        </div>
      </Modal>
    </div>
  );
};
export default DashboardView;
