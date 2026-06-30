import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { useNotebooks } from '../hooks/useNotebooks';
import { CreateNotebookSchema } from '../types';
import type { CreateNotebookInput } from '../types';
import { Card } from '../../../components/ui/Card.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Input } from '../../../components/ui/Input.tsx';

const COLORS = [
  '#aa3bff', // Brand Purple
  '#3b82f6', // Blue
  '#10b981', // Teal
  '#f59e0b', // Gold/Amber
  '#ef4444', // Red
  '#ec4899', // Pink
];

export const DashboardView: React.FC = () => {
  const { notebooks, isLoading, createNotebook } = useNotebooks();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

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
      color: COLORS[0],
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
      setSelectedColor(COLORS[0]);
    } catch (error) {
      console.error('Erro ao criar caderno:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
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
        <Card className="glass flex flex-col items-center justify-center text-center p-12 min-h-[40vh] border border-dashed border-slate-200 dark:border-dark-800">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500 mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-heading font-bold text-slate-800 dark:text-dark-100">
            Nenhum caderno criado
          </h3>
          <p className="text-sm text-slate-500 dark:text-dark-350 mt-2 max-w-sm">
            Comece criando o seu primeiro caderno para separar suas disciplinas da faculdade.
          </p>
          <Button
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="mt-6"
          >
            Criar meu primeiro caderno
          </Button>
        </Card>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
              Descrição (Opcional)
            </label>
            <textarea
              placeholder="Uma breve descrição sobre este caderno..."
              rows={3}
              className={`w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 focus:ring-brand-100 dark:border-dark-700 dark:focus:ring-brand-900/20 rounded-xl text-slate-900 dark:text-dark-50 placeholder-slate-400 focus:outline-none focus:ring-4 focus:border-brand-500 dark:focus:border-brand-600 transition-all duration-200`}
              {...register('description')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
              Cor de Identificação
            </label>
            <div className="flex gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform duration-200 hover:scale-110 cursor-pointer ${
                    selectedColor === color
                      ? 'border-slate-800 dark:border-white scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default DashboardView;
