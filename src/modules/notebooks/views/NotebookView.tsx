import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useNotebook } from "../hooks/useNotebooks";
import { useLeaves } from "../../leaves/hooks/useLeaves";
import { useNotebookFlashcards } from "../../study/hooks/useFlashcards";
import { useToggleBookmark } from "../../bookmarks/hooks/useToggleBookmark";
import { useSoftDeleteNotebook } from "../../trash/hooks/useTrash";
import { useEditorStatusStore } from "../../../store/editorStatusStore";
import { useNotebookActions } from "../hooks/useNotebookActions";
import { useNotebookLeafCreation } from "../hooks/useNotebookLeafCreation";
import { Button } from "../../../components/ui/Button.tsx";
import { Modal } from "../../../components/ui/Modal.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { TextArea } from "../../../components/ui/TextArea.tsx";
import { ColorPicker } from "../../../components/ui/ColorPicker.tsx";
import { EmptyState } from "../../../components/ui/EmptyState.tsx";
import { LeafCard } from "../components/LeafCard";
import { NotebookHeader } from "../components/NotebookHeader";
import { FlashcardsSection } from "../components/FlashcardsSection";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import { NOTEBOOK_COLORS } from "../constants";

export const NotebookView: React.FC = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();

  const { notebook, isLoading: isLoadingNotebook, updateNotebook } =
    useNotebook(notebookId || "");
  const { leaves, isLoading: isLoadingLeaves, createLeaf } =
    useLeaves(notebookId || "");
  const { data: flashcards = [], isLoading: isLoadingFlashcards } =
    useNotebookFlashcards(notebookId || "");
  const { isBookmarked, toggleBookmark } = useToggleBookmark({
    type: "notebook",
    id: notebookId || "",
    title: notebook?.title || "",
    path: `/notebooks/${notebookId}`,
  });
  const softDeleteNotebook = useSoftDeleteNotebook();
  const editorStatus = useEditorStatusStore();

  // ── Hook: Ações do notebook (editar, excluir, flashcards) ──
  const {
    isEditModalOpen,
    setIsEditModalOpen,
    selectedColor,
    setSelectedColor,
    isFlashcardModalOpen,
    setIsFlashcardModalOpen,
    selectedLeafId,
    setSelectedLeafId,
    actionError,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    registerEdit,
    handleSubmitEdit,
    editErrors,
    registerFc,
    handleSubmitFc,
    fcErrors,
    resetFc,
    createFlashcardMutation,
    handleOpenEditModal,
    onEditSubmit,
    handleDeleteNotebookConfirm,
    onFlashcardSubmit,
  } = useNotebookActions({
    notebookId: notebookId || "",
    notebook,
    navigate,
    updateNotebook,
    softDeleteNotebook,
    leaves,
  });

  // ── Hook: Criação de folhas ──
  const {
    isModalOpen,
    setIsModalOpen,
    parentLeafId,
    setParentLeafId,
    register,
    handleSubmit,
    errors,
    onSubmit,
    handleCloseModal,
  } = useNotebookLeafCreation({
    notebookId: notebookId || "",
    createLeaf,
    leaves,
  });

  // Sincroniza editorStatus com o notebook carregado
  useEffect(() => {
    if (notebook) {
      editorStatus.show();
      editorStatus.setLastUpdate(notebook.updatedAt.toString());
    }
    return () => {
      editorStatus.hide();
    };
  }, [notebook?.id, notebook?.updatedAt]);

  // ── Loading state ──
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
        <Link
          to="/dashboard"
          className="text-brand-500 hover:underline mt-2 inline-block"
        >
          Voltar para o Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Cabeçalho */}
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
                notebookId={notebookId || ""}
                onCreateSubLeaf={() => {
                  setParentLeafId(leaf.id);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Flashcards */}
      <FlashcardsSection
        flashcards={flashcards}
        isLoading={isLoadingFlashcards}
        notebookId={notebookId || ""}
        onOpenCreateModal={() => {
          if (leaves.length > 0) setSelectedLeafId(leaves[0].id);
          setIsFlashcardModalOpen(true);
        }}
      />

      {/* Modal: Criar Folha */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={parentLeafId ? "Criar Sub-folha" : "Criar Nova Folha"}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" form="create-leaf-form">
              Criar e Editar
            </Button>
          </div>
        }
      >
        <form
          id="create-leaf-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Título da Folha"
            placeholder="Ex: Aula 01 - Introdução ao Protocolo HTTP"
            error={errors.title?.message}
            {...register("title")}
          />
          {!parentLeafId && leaves.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
                Folha Pai (opcional - cria sub-folha)
              </label>
              <select
                value={parentLeafId || ""}
                onChange={(e) =>
                  setParentLeafId(e.target.value || undefined)
                }
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
              Esta será uma sub-folha de:{" "}
              {leaves.find((l) => l.id === parentLeafId)?.title || "..."}
            </p>
          )}
        </form>
      </Modal>

      {/* Modal: Criar Flashcard */}
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
              onClick={() => setIsFlashcardModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitFc(onFlashcardSubmit)}
              disabled={createFlashcardMutation.isPending}
            >
              {createFlashcardMutation.isPending ? "Criando..." : "Criar Flashcard"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
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
            {...registerFc("front", {
              required: "A pergunta é obrigatória",
            })}
          />
          <TextArea
            label="Resposta (Verso)"
            placeholder="Ex: a² + b² = c², onde c é a hipotenusa..."
            rows={4}
            {...registerFc("back", { required: "A resposta é obrigatória" })}
          />
          {fcErrors.back?.message && (
            <p className="text-xs text-rose-500 mt-1">
              {fcErrors.back.message}
            </p>
          )}
        </div>
      </Modal>

      {/* Modal: Editar Caderno */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Caderno"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="edit-notebook-form">
              Salvar Alterações
            </Button>
          </div>
        }
      >
        <form
          id="edit-notebook-form"
          onSubmit={handleSubmitEdit(onEditSubmit)}
          className="flex flex-col gap-5"
        >
          <Input
            label="Título do Caderno"
            placeholder="Ex: Engenharia de Software II, Cálculo III"
            error={editErrors.title?.message}
            {...registerEdit("title")}
          />
          <TextArea
            label="Descrição (Opcional)"
            placeholder="Uma breve descrição sobre este caderno..."
            rows={3}
            {...registerEdit("description")}
          />
          <ColorPicker
            colors={NOTEBOOK_COLORS}
            selectedColor={selectedColor}
            onChange={setSelectedColor}
            label="Cor de Identificação"
          />
          {actionError && (
            <div className="p-3 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400">
              {actionError}
            </div>
          )}
        </form>
      </Modal>

      {/* Confirmar exclusão */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
        }}
        onConfirm={handleDeleteNotebookConfirm}
        title="Excluir Caderno?"
        message="Tem certeza que deseja mover este caderno para a lixeira? Todas as folhas e flashcards associados também serão movidos."
        confirmLabel="Sim, Mover para Lixeira"
        cancelLabel="Cancelar"
        variant="danger"
      />

      {actionError && !isEditModalOpen && !confirmDeleteOpen && (
        <div className="p-3 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 animate-in fade-in slide-in-from-top-2 duration-200">
          {actionError}
        </div>
      )}
    </div>
  );
};

export default NotebookView;
