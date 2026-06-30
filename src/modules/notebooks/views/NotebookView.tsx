import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Plus,
  FileText,
  Play,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useNotebook } from '../hooks/useNotebooks';
import { CreateNotebookSchema } from '../types';
import type { CreateNotebookInput } from '../types';
import { useLeaves } from '../../leaves/hooks/useLeaves';
import { CreateLeafSchema } from '../../leaves/types';
import type { CreateLeafInput } from '../../leaves/types';
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

export const NotebookView: React.FC = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const { notebook, isLoading: isLoadingNotebook, updateNotebook, deleteNotebook } = useNotebook(notebookId || '');
  const { leaves, isLoading: isLoadingLeaves, createLeaf } = useLeaves(notebookId || '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLeafInput>({
    resolver: zodResolver(CreateLeafSchema),
    defaultValues: {
      title: '',
      content: '',
      rawText: '',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm<CreateNotebookInput>({
    resolver: zodResolver(CreateNotebookSchema),
  });

  const onSubmit = async (data: CreateLeafInput) => {
    if (!notebookId) return;
    try {
      const newLeaf = await createLeaf(data);
      setIsModalOpen(false);
      reset();
      // Redireciona diretamente para a tela de edição da nova folha
      navigate(`/notebooks/${notebookId}/leaves/${newLeaf.id}`);
    } catch (error) {
      console.error('Erro ao criar folha:', error);
    }
  };

  const handleOpenEditModal = () => {
    if (notebook) {
      setEditValue('title', notebook.title);
      setEditValue('description', notebook.description || '');
      setSelectedColor(notebook.color || COLORS[0]);
      setIsEditModalOpen(true);
    }
  };

  const onEditSubmit = async (data: CreateNotebookInput) => {
    try {
      await updateNotebook({
        ...data,
        color: selectedColor,
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar caderno:', error);
    }
  };

  const handleDeleteNotebook = async () => {
    if (window.confirm('Tem certeza que deseja excluir este caderno e todas as suas folhas? Esta ação não pode ser desfeita.')) {
      try {
        await deleteNotebook();
        navigate('/dashboard');
      } catch (error) {
        console.error('Erro ao excluir caderno:', error);
      }
    }
  };

  if (isLoadingNotebook || isLoadingLeaves) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-bold">Caderno não encontrado</h3>
        <Link to="/dashboard" className="text-brand-500 hover:underline mt-2 inline-block">
          Voltar para o Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Voltar */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para os Cadernos
      </Link>

      {/* Cabeçalho do Caderno */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 relative overflow-hidden">
        {/* Faixa lateral colorida */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3.5"
          style={{ backgroundColor: notebook.color }}
        />
        
        <div className="flex flex-col gap-2 pl-4">
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 dark:text-dark-50 m-0">
            {notebook.title}
          </h1>
          <p className="text-slate-550 dark:text-dark-300 text-sm max-w-xl">
            {notebook.description || 'Nenhuma descrição adicionada.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto pl-4">
          <Button
            variant="outline"
            onClick={handleOpenEditModal}
            leftIcon={<Edit2 className="h-4.5 w-4.5" />}
          >
            Editar
          </Button>

          <Button
            variant="outline"
            onClick={handleDeleteNotebook}
            className="text-rose-500 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            leftIcon={<Trash2 className="h-4.5 w-4.5" />}
          >
            Excluir
          </Button>

          <Button
            onClick={() => navigate(`/notebooks/${notebookId}/study`)}
            leftIcon={<Play className="h-4.5 w-4.5" />}
            className="bg-brand-500 shadow-md shadow-brand-500/10"
          >
            Estudar Flashcards
          </Button>
        </div>
      </div>

      {/* Listagem de Folhas */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-dark-100 m-0">
            Folhas de Anotação ({leaves.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nova Folha
          </Button>
        </div>

        {leaves.length === 0 ? (
          <Card className="glass flex flex-col items-center justify-center text-center p-12 min-h-[30vh] border border-dashed border-slate-200 dark:border-dark-800">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500 mb-4">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-md font-heading font-bold text-slate-850 dark:text-dark-100">
              Nenhuma folha criada neste caderno
            </h3>
            <p className="text-sm text-slate-500 dark:text-dark-350 mt-1 max-w-xs">
              Crie folhas para anotar os conteúdos de suas aulas e gerar materiais de estudo por IA.
            </p>
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              className="mt-4 text-brand-500"
            >
              Criar primeira folha
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaves.map((leaf) => (
              <Card
                key={leaf.id}
                hoverable
                onClick={() => navigate(`/notebooks/${notebookId}/leaves/${leaf.id}`)}
                className="flex items-center gap-4 border border-slate-100 dark:border-dark-800"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-500 dark:text-dark-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-heading font-bold truncate text-slate-800 dark:text-dark-50 m-0 group-hover:text-brand-500">
                    {leaf.title}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-dark-400 mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Atualizado em {new Date(leaf.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 dark:text-dark-500 flex-shrink-0" />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Folha */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Criar Nova Folha"
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
            <Button onClick={handleSubmit(onSubmit)}>Criar e Editar</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Título da Folha"
            placeholder="Ex: Aula 01 - Introdução ao Protocolo HTTP"
            error={errors.title?.message}
            {...register('title')}
          />
        </form>
      </Modal>

      {/* Modal Editar Caderno */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetEdit();
        }}
        title="Editar Caderno"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                resetEdit();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit(onEditSubmit)}>Salvar Alterações</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="flex flex-col gap-5">
          <Input
            label="Título do Caderno"
            placeholder="Ex: Engenharia de Software II, Cálculo III"
            error={editErrors.title?.message}
            {...registerEdit('title')}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
              Descrição (Opcional)
            </label>
            <textarea
              placeholder="Uma breve descrição sobre este caderno..."
              rows={3}
              className={`w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 focus:ring-brand-100 dark:border-dark-700 dark:focus:ring-brand-900/20 rounded-xl text-slate-900 dark:text-dark-50 placeholder-slate-400 focus:outline-none focus:ring-4 focus:border-brand-500 dark:focus:border-brand-600 transition-all duration-200`}
              {...registerEdit('description')}
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
        </form>
      </Modal>
    </div>
  );
};
export default NotebookView;
