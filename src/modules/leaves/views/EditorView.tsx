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
  Sparkles,
  HelpCircle,
  Play,
  BookmarkIcon,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  Archive,
  ArchiveRestore,
  Maximize2,
  Minimize2,
  Upload,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Annotation } from "../extensions/Annotation";
import { useLeaf, useLeaves, useArchivedLeaves } from "../hooks/useLeaves";
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
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Modal } from "../../../components/ui/Modal.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { EditorToolbar } from "../components/EditorToolbar";
import { EditorBubbleMenu } from "../components/EditorBubbleMenu";
import { AnnotationSidebar } from "../components/AnnotationSidebar";
import { EditorSkeleton } from "../components/EditorSkeleton";
import { LeafCard } from "../../notebooks/components/LeafCard";
import type { Leaf } from "../types";

const AI_TABS = [
  { id: "annotations" as const, label: "Anotações" },
  { id: "arquivos" as const, label: "Arquivos" },
  { id: "flashcards" as const, label: "Flashcards" },
  { id: "summary" as const, label: "Resumo" },
].sort((a, b) => a.label.localeCompare(b.label));

type AiTab = typeof AI_TABS[number]["id"];

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
    type: 'leaf',
    id: leafId || '',
    title: leaf?.title || '',
    path: `/notebooks/${notebookId}/leaves/${leafId}`,
  });
  const softDeleteLeaf = useSoftDeleteLeaf();
  const queryClient = useQueryClient();
  const editorStatus = useEditorStatusStore();

  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [subLeavesOpen, setSubLeavesOpen] = useState(false);

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

  const subLeaves = useMemo(
    () => (leaf?.children as Leaf[]) ?? [],
    [leaf],
  );

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

      queryClient.setQueryData<Leaf>(
        ["leaves", leafId],
        () => updatedLeaf,
      );

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
    mutationFn: (data: { leafId: string; notebookId: string; front: string; back: string }) =>
      studyService.createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves", leafId, "flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["notebook-flashcards", notebookId] });
      setIsFlashcardModalOpen(false);
      setManualFront("");
      setManualBack("");
    },
  });

  const handleCreateManualFlashcard = async () => {
    if (!leafId || !notebookId || !manualFront.trim() || !manualBack.trim()) return;
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
  const [activeTab, setActiveTab] = useState<AiTab>("summary");

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
      typeof leaf.updatedAt === 'string'
        ? leaf.updatedAt
        : leaf.updatedAt.toISOString()
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
    <div className="h-full min-h-0 flex flex-col gap-4">
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
            onClick={() => setEditorExpanded(!editorExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
            title={editorExpanded ? "Recolher editor" : "Expandir editor"}
          >
            {editorExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Split Pane Editor / IA */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Lado Esquerdo - Editor */}
        <div className={`flex-grow flex flex-col bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-3xl p-6 min-w-0 ${editorExpanded ? 'lg:w-full' : ''}`}>
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

          <div className="tiptap-editor flex-grow overflow-y-auto text-slate-750 dark:text-dark-100 relative">
            <EditorBubbleMenu editor={editor} />
            <EditorContent
              editor={editor}
              className="w-full h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:text-base [&_.ProseMirror]:caret-slate-800 [&_.dark_.ProseMirror]:caret-dark-100 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_p:first-child]:mt-0 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-heading [&_.ProseMirror_h1]:font-extrabold [&_.ProseMirror_h1]:tracking-tight [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-slate-900 [&_.dark_.ProseMirror_h1]:text-dark-50 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-heading [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:tracking-tight [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:text-slate-800 [&_.dark_.ProseMirror_h2]:text-dark-100 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-heading [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:tracking-tight [&_.ProseMirror_h3]:mb-1.5 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-slate-700 [&_.dark_.ProseMirror_h3]:text-dark-200 [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1.5[&_.ProseMirror_li_p]:my-0"
            />
          </div>
        </div>

        {/* Lado Direito - Painel de IA (toggle) */}
        {aiSidebarOpen && (
          <div className="w-full lg:w-[450px] flex flex-col bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-3xl overflow-hidden flex-shrink-0 min-h-0">
            {/* Abas - ordenadas alfabeticamente */}
            <div className="flex border-b border-slate-100 dark:border-dark-800/60 flex-shrink-0 bg-slate-50 dark:bg-dark-950/20">
              {AI_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 text-center font-heading font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
                    activeTab === tab.id
                      ? "border-brand-500 text-brand-500"
                      : "border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700"
                  }`}
                >
                  {tab.id === "flashcards"
                    ? `${tab.label} (${flashcards.length})`
                    : tab.label}
                </button>
              ))}
            </div>

            {/* Painel Interno */}
            <div className="flex-grow p-6 overflow-y-auto min-h-0">
              {activeTab === "annotations" && (
                <div className="flex flex-col h-full gap-4">
                  <AnnotationSidebar editor={editor} />
                </div>
              )}

              {activeTab === "summary" && (
                <div className="flex flex-col h-full gap-4">
                  {leaf.summary ? (
                    <div className="flex flex-col gap-4">
                      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-dark-200 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50/50 dark:bg-dark-950/30 p-5 rounded-2xl border border-slate-100/50 dark:border-dark-850">
                        {leaf.summary}
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleGenerateSummary}
                        isLoading={isGeneratingSummary}
                        leftIcon={<Sparkles className="h-4 w-4" />}
                        className="self-start"
                      >
                        Atualizar Resumo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-slate-800 dark:text-dark-100">
                          Nenhum resumo gerado
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-dark-350 mt-1 max-w-xs">
                          Escreva suas anotações no editor e clique abaixo para
                          gerar um resumo inteligente.
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerateSummary}
                        isLoading={isGeneratingSummary}
                        leftIcon={<Sparkles className="h-4.5 w-4.5" />}
                        disabled={!localRawText.trim()}
                      >
                        Gerar Resumo por IA
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "flashcards" && (
                <div className="flex flex-col h-full gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFlashcardModalOpen(true)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="w-full"
                  >
                    Criar Flashcard Manual
                  </Button>

                  {flashcards.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
                        <HelpCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-slate-800 dark:text-dark-100">
                          Nenhum flashcard
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-dark-350 mt-1 max-w-xs">
                          Crie flashcards manualmente ou gere por IA.
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerateFlashcards}
                        isLoading={isGeneratingFlashcards}
                        leftIcon={<Sparkles className="h-4.5 w-4.5" />}
                        disabled={!localRawText.trim()}
                      >
                        Gerar Flashcards por IA
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 dark:text-dark-400">
                          {flashcards.length} cards disponíveis
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/notebooks/${notebookId}/study`)
                          }
                          leftIcon={<Play className="h-3.5 w-3.5" />}
                        >
                          Estudar Agora
                        </Button>
                      </div>

                      <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
                        {flashcards.map((card) => (
                          <Card
                            key={card.id}
                            className="p-4 bg-slate-50/50 dark:bg-dark-950/30 border border-slate-100 dark:border-dark-850 flex flex-col gap-2.5"
                          >
                            <div className="text-xs font-bold text-brand-500 tracking-wide uppercase">
                              Pergunta:
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-dark-100">
                              {card.front}
                            </p>
                            <div className="border-t border-dashed border-slate-200 dark:border-dark-800 pt-2 text-xs font-bold text-slate-400 dark:text-dark-450 tracking-wide uppercase">
                              Resposta:
                            </div>
                            <p className="text-xs text-slate-600 dark:text-dark-300">
                              {card.back}
                            </p>
                          </Card>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleGenerateFlashcards}
                        isLoading={isGeneratingFlashcards}
                        leftIcon={<Sparkles className="h-4 w-4" />}
                      >
                        Recriar Flashcards
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "arquivos" && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-slate-800 dark:text-dark-100">
                        Anexar Arquivos
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-dark-350 mt-1 max-w-xs">
                        Arraste arquivos ou clique para fazer upload de imagens,
                        PDFs e documentos para esta folha.
                      </p>
                    </div>
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-700 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:border-brand-400 hover:text-brand-500 transition-all">
                        <Upload className="h-4 w-4" />
                        Selecionar Arquivos
                      </div>
                      <input type="file" multiple className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-dark-500">
                      Upload de imagens, PDF e documentos (max 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Barra de Sub-folhas (colapsável + drag & drop) ── */}
      {subLeaves.length > 0 && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-dark-800/60 pt-3 mt-1">
          <button
            type="button"
            onClick={() => setSubLeavesOpen(!subLeavesOpen)}
            className="flex items-center gap-2 mb-2 w-full text-left cursor-pointer group"
          >
            <FileText className="h-4 w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
            <h3 className="text-sm font-heading font-bold text-slate-500 dark:text-dark-400 group-hover:text-slate-700 dark:group-hover:text-dark-200 transition-colors">
              Sub-folhas ({subLeaves.length})
            </h3>
            {subLeavesOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400 ml-auto group-hover:text-slate-600 transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400 ml-auto group-hover:text-slate-600 transition-colors" />
            )}
          </button>

          {subLeavesOpen && (
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
                      notebookId={notebookId ?? ''}
                      onNavigate={(id) =>
                        navigate(`/notebooks/${notebookId}/leaves/${id}`)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
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
                !manualFront.trim() || !manualBack.trim() || createFlashcardMutation.isPending
              }
            >
              {createFlashcardMutation.isPending ? "Criando..." : "Criar Flashcard"}
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
    zIndex: isDragging ? 50 : 'auto' as const,
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
