import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  FileText,
  Play,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  ChevronRight,
  Sparkles,
  Lightbulb,
  BookmarkIcon,
  ChevronDown,
  ChevronUp,
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
import { useEditorStatusStore } from '../../../store/editorStatusStore';
import { NOTEBOOK_COLORS, DEFAULT_NOTEBOOK_COLOR } from '../../notebooks/constants';
import { TAG_COLOR_MAP } from '../../tags/constants';
import { LeafCard } from '../components/LeafCard';

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

  const handleDeleteNotebook = async () => {
    if (window.confirm('Mover este caderno para a lixeira? Ele ficará lá por 15 dias antes de ser excluído permanentemente.')) {
      try {
        await softDeleteNotebook.mutateAsync(notebookId || '');
        navigate('/dashboard');
      } catch (error) {
        console.error('Erro ao mover para lixeira:', error);
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

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap justify-end">
          {/* Bookmark button */}
          <button
            type="button"
            onClick={toggleBookmark}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isBookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20'
                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
            title={isBookmarked ? 'Remover marcador' : 'Adicionar marcador'}
          >
            <BookmarkIcon className={`h-5 w-5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>

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
              onClick={() => {
                setParentLeafId(undefined);
                setIsModalOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
              className="mt-4 text-brand-500"
            >
              Criar primeira folha
            </Button>
          </Card>
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

      {/* ── Seção de Flashcards ── */}
      <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-dark-800">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-dark-100 m-0">
            Flashcards ({flashcards.length})
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (leaves.length > 0) {
                  setSelectedLeafId(leaves[0].id);
                }
                setIsFlashcardModalOpen(true);
              }}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Criar Flashcard
            </Button>
          </div>
        </div>

        {isLoadingFlashcards ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : flashcards.length === 0 ? (
          <Card className="glass flex flex-col items-center justify-center text-center p-8 min-h-[20vh] border border-dashed border-slate-200 dark:border-dark-800">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 mb-3">
              <Lightbulb className="h-6 w-6" />
            </div>
            <h3 className="text-md font-heading font-bold text-slate-850 dark:text-dark-100">
              Nenhum flashcard criado
            </h3>
            <p className="text-sm text-slate-500 dark:text-dark-350 mt-1 max-w-md">
              Crie flashcards manualmente ou gere automaticamente pela IA ao editar uma folha.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {flashcards.slice(0, 10).map((card) => (
              <Card
                key={card.id}
                className="flex flex-col gap-2 p-4 border border-slate-100 dark:border-dark-800"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-dark-50 line-clamp-2">
                  <span className="text-xs font-bold text-brand-500 mr-1.5">Q:</span>
                  {card.front}
                </p>
                <p className="text-sm text-slate-500 dark:text-dark-350 line-clamp-2">
                  <span className="text-xs font-bold text-emerald-500 mr-1.5">R:</span>
                  {card.back}
                </p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-400 dark:text-dark-400">
                    Repetições: {card.repetitions}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-400 dark:text-dark-400">
                    EF: {card.easeFactor}
                  </span>
                </div>
              </Card>
            ))}
            {flashcards.length > 10 && (
              <p className="text-xs text-slate-400 dark:text-dark-400 text-center col-span-full pt-2">
                + {flashcards.length - 10} flashcards ocultos. Estude-os na sessão de revisão.
              </p>
            )}
          </div>
        )}
      </div>

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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
              Resposta (Verso)
            </label>
            <textarea
              placeholder="Ex: a² + b² = c², onde c é a hipotenusa..."
              rows={4}
              className={`w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-900 dark:text-dark-50 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 resize-none`}
              {...registerFc('back', { required: 'A resposta é obrigatória' })}
            />
            {fcErrors.back?.message && (
              <p className="text-xs text-rose-500 mt-1">{fcErrors.back.message}</p>
            )}
          </div>
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
              {NOTEBOOK_COLORS.map((color) => (
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


export default NotebookView;
