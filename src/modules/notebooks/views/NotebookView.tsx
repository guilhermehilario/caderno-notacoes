import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  FileText,
  Loader2,
} from 'lucide-react';
import { useNotebook } from '../hooks/useNotebooks';
import { CreateNotebookSchema } from '../types';
import type { CreateNotebookInput } from '../types';
import { useLeaves } from '../../leaves/hooks/useLeaves';
import { CreateLeafSchema } from '../../leaves/types';
import type { CreateLeafInput } from '../../leaves/types';
import { useNotebookFlashcards } from '../../study/hooks/useFlashcards';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import studyService from '../../study/services/studyService';
import { useToggleBookmark } from '../../bookmarks/hooks/useToggleBookmark';
import { useSoftDeleteNotebook } from '../../trash/hooks/useTrash';
import { Card } from '../../../components/ui/Card.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Modal } from '../../../components/ui/Modal.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { TextArea } from '../../../components/ui/TextArea.tsx';
import { ColorPicker } from '../../../components/ui/ColorPicker.tsx';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { useEditorStatusStore } from '../../../store/editorStatusStore';
import { NOTEBOOK_COLORS } from '../../notebooks/constants';
import { LeafCard } from '../components/LeafCard';
import { NotebookHeader } from '../components/NotebookHeader';
import { FlashcardsSection } from '../components/FlashcardsSection';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.tsx';

export const NotebookView: React.FC = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(NOTEBOOK_COLORS[0]);
  const [selectedLeafId, setSelectedLeafId] = useState('');
  const [parentLeafId, setParentLeafId] = useState<string | undefined>(undefined);

  const { notebook, isLoading: isLoadingNotebook, updateNotebook } = useNotebook(notebookId || '');
  const { leaves, isLoading: isLoadingLeaves, createLeaf } = useLeaves(notebookId || '');
  const { data: flashcards = [], isLoading: isLoadingFlashcards } = useNotebookFlashcards(notebookId || '');
  const { isBookmarked, toggleBookmark } = useToggleBookmark({
    type: 'notebook',
    id: notebookId || '',
    title: notebook?.title || '',
    path: `/notebooks/${notebookId}`,
  });
  const softDeleteNotebook = useSoftDeleteNotebook();
  const queryClient = useQueryClient();
  const editorStatus = useEditorStatusStore();

  // Update editor status store when notebook loads
  useEffect(() => {
    if (notebook) {
      editorStatus.show();
      editorStatus.setLastUpdate(notebook.updatedAt.toString());
    }
    return () => {
      editorStatus.hide();
    };
  }, [notebook?.id, notebook?.updatedAt]);

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

  // ── Flashcard manual form ──
  const {
    register: registerFc,
    handleSubmit: handleSubmitFc,
    reset: resetFc,
    formState: { errors: fcErrors },
  } = useForm<{ front: string; back: string }>();

  const createFlashcardMutation = useMutation({
    mutationFn: (data: { leafId: string; notebookId: string; front: string; back: string }) =>
      studyService.createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebook-flashcards', notebookId] });
      setIsFlashcardModalOpen(false);
      resetFc();
      setSelectedLeafId('');
    },
  });

  const onFlashcardSubmit = async (data: { front: string; back: string }) => {
    if (!notebookId || !selectedLeafId) return;
    try {
      await createFlashcardMutation.mutateAsync({
        leafId: selectedLeafId,
        notebookId,
        front: data.front,
        back: data.back,
      });
    } catch (error) {
      console.error('Erro ao criar flashcard:', error);
    }
  };

  const onSubmit = async (data: CreateLeafInput) => {
    if (!notebookId) return;
    try {
      const newLeaf = await createLeaf({
        ...data,
        parentId: parentLeafId,
      });
      setIsModalOpen(false);
      reset();
      setParentLeafId(undefined);
      navigate(`/notebooks/${notebookId}/leaves/${newLeaf.id}`);
    } catch (error) {
      console.error('Erro ao criar folha:', error);
    }
  };

  const handleOpenEditModal = () => {
    if (notebook) {
      setEditValue('title', notebook.title);
      setEditValue('description', notebook.description || '');
      setSelectedColor(notebook.color || NOTEBOOK_COLORS[0]);
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

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDeleteNotebookConfirm = async () => {
    try {
      await softDeleteNotebook.mutateAsync(notebookId || '');
      setConfirmDeleteOpen(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao mover para lixeira:', error);
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
      {/* Cabeçalho do Caderno */}
      <NotebookHeader
        notebook={notebook}
        isBookmarked={isBookmarked}
        onToggleBookmark={toggleBookmark}
        onOpenEditModal={handleOpenEditModal}
        onDelete={() => setConfirmDeleteOpen(true)}
      />

      {/* Listagem de Folhas */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-dark-100 m-0">
            Folhas de Anotação ({leaves.length})
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setParentLeafId(undefined);
                setIsModalOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nova Folha
            </Button>
          </div>
        </div>

        {leaves.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Nenhuma folha criada neste caderno"
            description="Crie folhas para anotar os conteúdos de suas aulas e gerar materiais de estudo por IA."
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setParentLeafId(undefined);
                  setIsModalOpen(true);
                }}
                leftIcon={<Plus className="h-4 w-4" />}
                className="mt-4 text-brand-500"
              >
                Criar primeira folha
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaves.map((leaf) => (
              <LeafCard
                key={leaf.id}
                leaf={leaf}
                notebookId={notebookId || ''}
                onCreateSubLeaf={() => {
                  setParentLeafId(leaf.id);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção de Flashcards */}
      <FlashcardsSection
        flashcards={flashcards}
        isLoading={isLoadingFlashcards}
        notebookId={notebookId || ''}
        onOpenCreateModal={() => {
          if (leaves.length > 0) {
            setSelectedLeafId(leaves[0].id);
          }
          setIsFlashcardModalOpen(true);
        }}
      />

      {/* Modal Criar Folha (com suporte a sub-folha) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setParentLeafId(undefined);
        }}
        title={parentLeafId ? 'Criar Sub-folha' : 'Criar Nova Folha'}
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setParentLeafId(undefined);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>Criar e Editar</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Título da Folha"
            placeholder="Ex: Aula 01 - Introdução ao Protocolo HTTP"
            error={errors.title?.message}
            {...register('title')}
          />

          {/* Parent leaf selector (only when creating sub-leaf) */}
          {!parentLeafId && leaves.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
                Folha Pai (opcional - cria sub-folha)
              </label>
              <select
                value={parentLeafId || ''}
                onChange={(e) => setParentLeafId(e.target.value || undefined)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-500 dark:text-dark-400 text-sm focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 cursor-pointer"
              >
                <option value="">Sem pai (folha raiz)</option>
                {leaves.map((leaf) => (
                  <option key={leaf.id} value={leaf.id}>
                    {leaf.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {parentLeafId && (
            <p className="text-xs text-brand-500 font-semibold">
              Esta será uma sub-folha de: {leaves.find((l) => l.id === parentLeafId)?.title || '...'}
            </p>
          )}
        </div>
      </Modal>

      {/* Modal Criar Flashcard Manual */}
      <Modal
        isOpen={isFlashcardModalOpen}
        onClose={() => {
          setIsFlashcardModalOpen(false);
          resetFc();
        }}
        title="Criar Flashcard Manualmente"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsFlashcardModalOpen(false);
                resetFc();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitFc(onFlashcardSubmit)}
              disabled={createFlashcardMutation.isPending}
            >
              {createFlashcardMutation.isPending ? 'Criando...' : 'Criar Flashcard'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Seletor de Folha */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
              Vincular à Folha
            </label>
            <select
              value={selectedLeafId}
              onChange={(e) => setSelectedLeafId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-900 dark:text-dark-50 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 cursor-pointer"
            >
              <option value="">Selecione uma folha...</option>
              {leaves.map((leaf) => (
                <option key={leaf.id} value={leaf.id}>
                  {leaf.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Pergunta (Frente)"
            placeholder="Ex: Qual a fórmula do teorema de Pitágoras?"
            error={fcErrors.front?.message}
            {...registerFc('front', { required: 'A pergunta é obrigatória' })}
          />

          <TextArea
            label="Resposta (Verso)"
            placeholder="Ex: a² + b² = c², onde c é a hipotenusa..."
            rows={4}
            {...registerFc('back', { required: 'A resposta é obrigatória' })}
          />
          {fcErrors.back?.message && (
            <p className="text-xs text-rose-500 mt-1">{fcErrors.back.message}</p>
          )}
        </div>
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
        <div className="flex flex-col gap-5">
          <Input
            label="Título do Caderno"
            placeholder="Ex: Engenharia de Software II, Cálculo III"
            error={editErrors.title?.message}
            {...registerEdit('title')}
          />

          <TextArea
            label="Descrição (Opcional)"
            placeholder="Uma breve descrição sobre este caderno..."
            rows={3}
            {...registerEdit('description')}
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

      {/* Confirmar exclusão */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteNotebookConfirm}
        title="Mover para lixeira?"
        message="Mover este caderno para a lixeira? Ele ficará lá por 15 dias antes de ser excluído permanentemente."
        confirmLabel="Mover para Lixeira"
        variant="danger"
      />
    </div>
  );
};

export default NotebookView;
