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
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Annotation } from "../extensions/Annotation";
import { useLeaf } from "../hooks/useLeaves";
import { useLeafFlashcards } from "../../study/hooks/useFlashcards";
import { useDebounce } from "../../../hooks/useDebounce";
import { useQueryClient } from "@tanstack/react-query";
import { useToggleBookmark } from "../../bookmarks/hooks/useToggleBookmark";
import { useSoftDeleteLeaf } from "../../trash/hooks/useTrash";
import { useEditorStatusStore } from "../../../store/editorStatusStore";
import { EditorToolbar } from "../components/EditorToolbar";
import { EditorBubbleMenu } from "../components/EditorBubbleMenu";
import { AISidebar } from "../components/AISidebar";
import { EditorSkeleton } from "../components/EditorSkeleton";
import { EditorHeader } from "../components/EditorHeader";
import { SubLeavesSection } from "../components/SubLeavesSection";
import { ManualFlashcardModal } from "../components/ManualFlashcardModal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
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

  const handleExpandToggle = useCallback(() => {
    setEditorExpanded((prev) => {
      const expanding = !prev;
      if (expanding) {
        setAiSidebarOpen(false);
      }
      return expanding;
    });
  }, []);

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

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!leafId) return;
    try {
      await softDeleteLeaf.mutateAsync(leafId);
      setConfirmDeleteOpen(false);
      navigate(`/notebooks/${notebookId}`);
    } catch (err) {
      console.error("Erro ao excluir folha:", err);
    }
  };

  // ── Flashcard manual form ──
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);

  // Estados locais para inputs editáveis do usuário
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localRawText, setLocalRawText] = useState("");

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
    editorProps: {
      attributes: {
        style:
          "overflow-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; width: 100%; max-width: 100%; box-sizing: border-box;",
      },
    },
  });

  // Aplica estilos diretamente no DOM do ProseMirror após montagem
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view?.dom as HTMLElement | undefined;
    if (!editorDom) return;

    // Força os estilos de quebra de texto diretamente via JS
    Object.assign(editorDom.style, {
      overflowWrap: "break-word",
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    });
  }, [editor]);

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
            editorStatus.setSaveStatus("saved");
          });
        })
        .catch(() => {
          startTransition(() => {
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

  // Mostra skeleton apenas na primeira carga (sem dados em cache)
  if (!leaf && isLoadingLeaf) {
    return <EditorSkeleton />;
  }

  // Se tem dados em cache mas editor ainda sincronizando, mostra tela vazia
  // (evita flash de skeleton desnecessário)
  if (leaf && !contentReady) {
    return null;
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
      <EditorHeader
        leafId={leafId || ""}
        isBookmarked={isBookmarked}
        isArchived={isArchived}
        aiSidebarOpen={aiSidebarOpen}
        editorExpanded={editorExpanded}
        onToggleBookmark={toggleBookmark}
        onArchiveToggle={handleArchiveToggle}
        onDelete={() => setConfirmDeleteOpen(true)}
        onToggleAiSidebar={() => setAiSidebarOpen(!aiSidebarOpen)}
        onToggleExpand={handleExpandToggle}
      />

      {/* Split Pane Editor / IA */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[700px] lg:min-h-[90vh] overflow-hidden">
        {/* Lado Esquerdo - Editor */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-3xl p-6 min-w-0 ${editorExpanded ? "lg:w-full" : ""}`}
        >
          <input
            type="text"
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
              editorStatus.setSaveStatus("saving");
            }}
            placeholder="Título da folha..."
            className="w-full text-2xl font-heading font-extrabold tracking-tight bg-transparent text-slate-900 dark:text-dark-50 placeholder-slate-350 focus:outline-none mb-6 border-b border-transparent focus:border-slate-100 dark:focus:border-dark-800 pb-2 transition-all"
          />

          <EditorToolbar
            editor={editor}
            annotationTrigger={annotationTrigger}
          />

          <div className="tiptap-editor flex-1 overflow-y-auto overflow-x-hidden text-slate-750 dark:text-dark-100 relative min-h-[400px] min-w-0 w-full max-w-full">
            <EditorBubbleMenu editor={editor} />
            <EditorContent
              editor={editor}
              className="tiptap-content w-full h-full"
              style={{
                maxWidth: '100%',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Lado Direito - Painel de IA */}
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

      {/* Sub-folhas com drag & drop */}
      {!editorExpanded && leaf && (
        <SubLeavesSection
          leaf={leaf}
          notebookId={notebookId || ""}
          leafId={leafId || ""}
        />
      )}

      {/* Modal: Criar Flashcard Manual */}
      <ManualFlashcardModal
        isOpen={isFlashcardModalOpen}
        onClose={() => setIsFlashcardModalOpen(false)}
        leafId={leafId || ""}
        notebookId={notebookId || ""}
      />

      {/* Confirmar exclusão */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Mover para lixeira?"
        message={`Mover "${leaf?.title}" para a lixeira?`}
        confirmLabel="Mover para Lixeira"
        variant="danger"
      />
    </div>
  );
};

export default memo(EditorView);
