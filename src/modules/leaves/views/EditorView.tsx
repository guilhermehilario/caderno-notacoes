import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
  memo,
} from "react";
import type { Editor } from "@tiptap/react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  BookmarkIcon,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  Archive,
  ArchiveRestore,
  Maximize2,
  Minimize2,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Annotation } from "../extensions/Annotation";
import { useLeaf, useLeaves } from "../hooks/useLeaves";
import { useLeafFlashcards } from "../../study/hooks/useFlashcards";
import { useDebounce } from "../../../hooks/useDebounce";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import leafService from "../services/leafService";
import studyService from "../../study/services/studyService";
import { useToggleBookmark } from "../../bookmarks/hooks/useToggleBookmark";
import { useSoftDeleteLeaf } from "../../trash/hooks/useTrash";
import { TagSelector } from "../components/TagSelector/TagSelector";
import { useEditorStatusStore } from "../../../store/editorStatusStore";
import { Button } from "../../../components/ui/Button.tsx";
import { Modal } from "../../../components/ui/Modal.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { EditorToolbar } from "../components/EditorToolbar";
import { EditorBubbleMenu } from "../components/EditorBubbleMenu";
import { AISidebar } from "../components/AISidebar";
import { EditorSkeleton } from "../components/EditorSkeleton";
import type { Leaf } from "../types";

const EditorView: React.FC = () => {
  const { notebookId, leafId } = useParams<{
    notebookId: string;
    leafId: string;
  }>();
  const navigate = useNavigate();

  const {
    leaf,
    isLoading: isLoadingLeaf,
    updateLeaf,
    generateAISummary,
    isGeneratingSummary,
    generateAIFlashcards,
    isGeneratingFlashcards,
    archiveLeaf,
    unarchiveLeaf,
  } = useLeaf(leafId || "");

  const { leaves } = useLeaves(notebookId || "");
  const { data: flashcards = [] } = useLeafFlashcards(leafId || "");
  const { isBookmarked, toggleBookmark } = useToggleBookmark({
    type: "leaf",
    id: leafId || "",
    title: leaf?.title || "",
    path: `/notebooks/${notebookId}/leaves/${leafId}`,
  });
  const softDeleteLeaf = useSoftDeleteLeaf();
  const queryClient = useQueryClient();
  const editorStatus = useEditorStatusStore();

  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [subLeavesOpen, setSubLeavesOpen] = useState(false);

  const handleExpandToggle = useCallback(() => {
    setEditorExpanded((prev) => {
      const expanding = !prev;
      if (expanding) {
        setAiSidebarOpen(false);
        setSubLeavesOpen(false);
      }
      return expanding;
    });
  }, []);

  // ── Reorder sub-leaves via drag & drop ──
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      leafService.reorderLeaves(orderedIds, leafId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notebooks", notebookId, "leaves"],
      });
      queryClient.invalidateQueries({
        queryKey: ["leaves", leafId],
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const subLeaves = useMemo(() => (leaf?.children as Leaf[]) ?? [], [leaf]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = subLeaves.findIndex((l) => l.id === active.id);
      const newIndex = subLeaves.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(subLeaves, oldIndex, newIndex);

      // Atualiza os caches imediatamente para feedback visual instantâneo
      const updatedLeaf = { ...leaf!, children: reordered };

      queryClient.setQueryData<Leaf[]>(
        ["notebooks", notebookId, "leaves"],
        (old) => {
          if (!old) return old;
          return old.map((l) => {
            if (l.id === leafId) {
              return { ...l, children: reordered };
            }
            return l;
          });
        },
      );

      queryClient.setQueryData<Leaf>(["leaves", leafId], () => updatedLeaf);

      // Persiste a nova ordem no backend
      reorderMutation.mutate(reordered.map((l) => l.id));
    },
    [subLeaves, leaf, notebookId, leafId, queryClient, reorderMutation],
  );

  // Check if current page is archived
  const isArchived = leaf?.archivedAt != null;

  const handleArchiveToggle = async () => {
    if (!leafId) return;
    try {
      if (isArchived) {
        await unarchiveLeaf();
      } else {
        await archiveLeaf();
      }
      queryClient.invalidateQueries({ queryKey: ["leaves", leafId] });
    } catch (err) {
      console.error("Erro ao arquivar/desarquivar:", err);
    }
  };

  const handleDelete = async () => {
    if (!leafId) return;
    if (window.confirm(`Mover "${leaf?.title}" para a lixeira?`)) {
      try {
        await softDeleteLeaf.mutateAsync(leafId);
        navigate(`/notebooks/${notebookId}`);
      } catch (err) {
        console.error("Erro ao excluir folha:", err);
      }
    }
  };

  // ── Flashcard manual form ──
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [manualFront, setManualFront] = useState("");
  const [manualBack, setManualBack] = useState("");

  const createFlashcardMutation = useMutation({
    mutationFn: (data: {
      leafId: string;
      notebookId: string;
      front: string;
      back: string;
    }) => studyService.createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leaves", leafId, "flashcards"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notebook-flashcards", notebookId],
      });
      setIsFlashcardModalOpen(false);
      setManualFront("");
      setManualBack("");
    },
  });

  const handleCreateManualFlashcard = async () => {
    if (!leafId || !notebookId || !manualFront.trim() || !manualBack.trim())
      return;
    try {
      await createFlashcardMutation.mutateAsync({
        leafId,
        notebookId,
        front: manualFront.trim(),
        back: manualBack.trim(),
      });
    } catch (err) {
      console.error("Erro ao criar flashcard manual:", err);
    }
  };

  // Estados locais para inputs editáveis do usuário
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localRawText, setLocalRawText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  const initialSyncDoneRef = useRef(false);
  const serverContentRef = useRef("");
  const lastSavedRef = useRef({ title: "", content: "" });
  const saveInFlightRef = useRef(false);
  const [contentReady, setContentReady] = useState(false);

  const [annotationText, setAnnotationText] = useState<string | null>(null);
  const annotationTrigger = useMemo(
    () => (annotationText ? { text: annotationText } : null),
    [annotationText],
  );
  const pendingRAF = useRef<number | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Highlight.configure({ multicolor: true }),
      Annotation,
      Placeholder.configure({
        placeholder: "Comece a digitar o conteúdo da sua aula aqui...",
      }),
    ],
    [],
  );

  const handleEditorUpdate = useCallback(
    ({ editor: ed }: { editor: Editor }) => {
      const currentHtml = ed.getHTML();
      if (currentHtml === serverContentRef.current) return;

      setLocalContent(currentHtml);
      setLocalRawText(ed.getText());
      editorStatus.setSaveStatus("saving");
    },
    [],
  );

  const editor = useEditor({
    extensions,
    content: "",
    onUpdate: handleEditorUpdate,
    immediatelyRender: false,
  });

  // Click handler for annotations
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view?.dom as HTMLElement | undefined;
    if (!editorDom) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const spanEl = target?.closest?.(
        "span.annotation-anchor[data-annotation]",
      );
      if (!spanEl) return;
      const text = spanEl.getAttribute("data-annotation") || "";
      if (!text) return;

      if (pendingRAF.current !== null) cancelAnimationFrame(pendingRAF.current);
      pendingRAF.current = requestAnimationFrame(() => {
        pendingRAF.current = null;
        if (!editor.isDestroyed) {
          editor.chain().focus().extendMarkRange("annotation").run();
          setAnnotationText(text);
        }
      });
    };

    editorDom.addEventListener("click", handleClick);
    return () => {
      editorDom.removeEventListener("click", handleClick);
      if (pendingRAF.current !== null) {
        cancelAnimationFrame(pendingRAF.current);
        pendingRAF.current = null;
      }
    };
  }, [editor]);

  // Single sync effect
  useEffect(() => {
    if (!leaf || !editor || initialSyncDoneRef.current) return;

    const serverContent = leaf.content || "";
    serverContentRef.current = serverContent;
    lastSavedRef.current = { title: leaf.title, content: serverContent };

    editor.commands.setContent(serverContent);

    startTransition(() => {
      setLocalTitle(leaf.title);
      setLocalContent(serverContent);
      setLocalRawText(leaf.rawText || "");
      setContentReady(true);
    });

    initialSyncDoneRef.current = true;
    editorStatus.show();
    editorStatus.setLastUpdate(
      typeof leaf.updatedAt === "string"
        ? leaf.updatedAt
        : leaf.updatedAt.toISOString(),
    );
  }, [leaf, editor]);

  const debouncedTitle = useDebounce(localTitle, 1500);
  const debouncedContent = useDebounce(localContent, 1500);
  const debouncedRawText = useDebounce(localRawText, 1500);

  // Auto-save effect
  useEffect(() => {
    if (!initialSyncDoneRef.current) return;

    const lastSaved = lastSavedRef.current;
    if (
      debouncedTitle !== lastSaved.title ||
      debouncedContent !== lastSaved.content
    ) {
      if (saveInFlightRef.current) return;

      saveInFlightRef.current = true;
      startTransition(() => {
        setSaveStatus("saving");
        editorStatus.setSaveStatus("saving");
      });

      void updateLeaf({
        title: debouncedTitle,
        content: debouncedContent,
        rawText: debouncedRawText,
      })
        .then(() => {
          lastSavedRef.current = {
            title: debouncedTitle,
            content: debouncedContent,
          };
          editorStatus.setLastUpdate(new Date().toISOString());
          startTransition(() => {
            setSaveStatus("saved");
            editorStatus.setSaveStatus("saved");
          });
        })
        .catch(() => {
          startTransition(() => {
            setSaveStatus("error");
            editorStatus.setSaveStatus("error");
          });
        })
        .finally(() => {
          saveInFlightRef.current = false;
        });
    }
  }, [debouncedTitle, debouncedContent, debouncedRawText, updateLeaf]);

  const handleGenerateSummary = async () => {
    if (!leafId) return;
    try {
      await generateAISummary();
    } catch (err) {
      console.error("Erro ao gerar resumo:", err);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!leafId) return;
    try {
      await generateAIFlashcards();
    } catch (err) {
      console.error("Erro ao gerar flashcards:", err);
    }
  };

  if (isLoadingLeaf || (leaf && !contentReady)) {
    return <EditorSkeleton />;
  }

  if (!leaf) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-bold">Folha de anotação não encontrada</h3>
        <RouterLink
          to={`/notebooks/${notebookId}`}
          className="text-brand-500 hover:underline"
        >
          Voltar para o caderno
        </RouterLink>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-150 dark:border-dark-800 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Tag Selector */}
          {leafId && <TagSelector leafId={leafId} />}

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={toggleBookmark}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer ${
              isBookmarked
                ? "text-amber-500"
                : "text-slate-500 dark:text-dark-300 hover:text-amber-500"
            }`}
            title={isBookmarked ? "Remover marcador" : "Adicionar marcador"}
          >
            <BookmarkIcon
              className={`h-3.5 w-3.5 ${isBookmarked ? "fill-amber-500" : ""}`}
            />
            {isBookmarked ? "Marcado" : "Marcar"}
          </button>

          {/* Archive Button */}
          <button
            type="button"
            onClick={handleArchiveToggle}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer ${
              isArchived
                ? "text-emerald-500"
                : "text-slate-500 dark:text-dark-300 hover:text-emerald-500"
            }`}
            title={isArchived ? "Desarquivar" : "Arquivar"}
          >
            {isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {isArchived ? "Arquivado" : "Arquivar"}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-dark-300 hover:text-rose-500 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
            title="Mover para lixeira"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle AI Sidebar */}
          <button
            type="button"
            onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
            title={aiSidebarOpen ? "Ocultar painel IA" : "Mostrar painel IA"}
          >
            {aiSidebarOpen ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
            IA
          </button>

          {/* Expand Editor */}
          <button
            type="button"
            onClick={handleExpandToggle}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer ${
              editorExpanded
                ? "text-brand-500 bg-brand-50 dark:bg-brand-950/20"
                : "text-slate-500 dark:text-dark-300 hover:text-brand-500"
            }`}
            title={editorExpanded ? "Recolher editor" : "Expandir editor"}
          >
            {editorExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {editorExpanded ? "Recolher" : "Expandir"}
          </button>
        </div>
      </div>

      {/* Split Pane Editor / IA */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Lado Esquerdo - Editor */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-3xl p-6 min-w-0 ${editorExpanded ? "lg:w-full" : ""}`}
        >
          <input
            type="text"
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
              setSaveStatus("saving");
              editorStatus.setSaveStatus("saving");
            }}
            placeholder="Título da folha..."
            className="w-full text-2xl font-heading font-extrabold tracking-tight bg-transparent text-slate-900 dark:text-dark-50 placeholder-slate-350 focus:outline-none mb-6 border-b border-transparent focus:border-slate-100 dark:focus:border-dark-800 pb-2 transition-all"
          />

          <EditorToolbar
            editor={editor}
            annotationTrigger={annotationTrigger}
          />

          <div className="tiptap-editor flex-1 overflow-y-auto text-slate-750 dark:text-dark-100 relative min-h-0">
            <EditorBubbleMenu editor={editor} />
            <EditorContent
              editor={editor}
              className="tiptap-content w-full h-full"
            />
          </div>
        </div>

        {/* Lado Direito - Painel de IA (toggle, escondido quando expandido) */}
        {aiSidebarOpen && !editorExpanded && (
          <AISidebar
            editor={editor}
            summary={leaf?.summary}
            flashcards={flashcards}
            notebookId={notebookId || ""}
            localRawText={localRawText}
            isGeneratingSummary={isGeneratingSummary}
            isGeneratingFlashcards={isGeneratingFlashcards}
            onCreateManualFlashcard={() => setIsFlashcardModalOpen(true)}
            onGenerateSummary={handleGenerateSummary}
            onGenerateFlashcards={handleGenerateFlashcards}
          />
        )}
      </div>

      {/* ── Barra de Sub-folhas (colapsável + drag & drop, escondida quando expandido) ── */}
      {!editorExpanded && subLeaves.length > 0 && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-dark-800/60 pt-3 mt-1">
          <button
            type="button"
            onClick={() => setSubLeavesOpen(!subLeavesOpen)}
            className="flex items-center gap-2 w-full text-left cursor-pointer group pb-2"
          >
            <FileText className="h-4 w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
            <h3 className="text-sm font-heading font-bold text-slate-500 dark:text-dark-400 group-hover:text-slate-700 dark:group-hover:text-dark-200 transition-colors">
              Sub-folhas ({subLeaves.length})
            </h3>
            <div
              className="ml-auto transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                transform: subLeavesOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}
            >
              <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </button>

          {/* Animação de altura com CSS grid trick */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{
              gridTemplateRows: subLeavesOpen ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden min-h-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={subLeaves.map((l) => l.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-3 overflow-x-auto pb-2 max-h-[30vh] overflow-y-auto">
                    {subLeaves.map((subLeaf) => (
                      <SortableSubLeafCard
                        key={subLeaf.id}
                        subLeaf={subLeaf}
                        notebookId={notebookId ?? ""}
                        onNavigate={(id) =>
                          navigate(`/notebooks/${notebookId}/leaves/${id}`)
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar Flashcard Manual */}
      <Modal
        isOpen={isFlashcardModalOpen}
        onClose={() => {
          setIsFlashcardModalOpen(false);
          setManualFront("");
          setManualBack("");
        }}
        title="Criar Flashcard Manual"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsFlashcardModalOpen(false);
                setManualFront("");
                setManualBack("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateManualFlashcard}
              disabled={
                !manualFront.trim() ||
                !manualBack.trim() ||
                createFlashcardMutation.isPending
              }
            >
              {createFlashcardMutation.isPending
                ? "Criando..."
                : "Criar Flashcard"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Pergunta (Frente)"
            placeholder="Ex: Qual a fórmula do teorema de Pitágoras?"
            value={manualFront}
            onChange={(e) => setManualFront(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200">
              Resposta (Verso)
            </label>
            <textarea
              placeholder="Ex: a² + b² = c², onde c é a hipotenusa..."
              rows={4}
              value={manualBack}
              onChange={(e) => setManualBack(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-slate-900 dark:text-dark-50 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 focus:border-brand-500 transition-all duration-200 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── Componente de Sub-folha com suporte a drag & drop ──
interface SortableSubLeafCardProps {
  subLeaf: Leaf;
  notebookId: string;
  onNavigate: (id: string) => void;
}

const SortableSubLeafCard: React.FC<SortableSubLeafCardProps> = ({
  subLeaf,
  notebookId,
  onNavigate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subLeaf.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as const),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-72 rounded-2xl bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 hover:border-brand-200 dark:hover:border-brand-900/40 hover:shadow-md transition-all overflow-hidden"
    >
      <div className="flex items-stretch">
        {/* Área de drag handle */}
        <button
          type="button"
          className="flex items-center justify-center w-8 min-h-full bg-slate-50 dark:bg-dark-950/30 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-400 hover:text-slate-600 dark:hover:text-dark-300 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
          {...attributes}
          {...listeners}
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Conteúdo do card */}
        <button
          type="button"
          onClick={() => onNavigate(subLeaf.id)}
          className="flex-1 p-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-500 dark:text-dark-300 flex-shrink-0">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <h4 className="font-heading font-semibold text-sm truncate text-slate-800 dark:text-dark-50">
              {subLeaf.title}
            </h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-dark-400 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(subLeaf.updatedAt).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-brand-500">
            Abrir <ChevronRight className="h-3 w-3" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default memo(EditorView);
