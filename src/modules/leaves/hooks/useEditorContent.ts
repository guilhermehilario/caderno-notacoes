import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";
import { useToastStore } from "../../../store/toastStore";
import { extractApiError } from "../../../utils/api-errors";
import type { Editor } from "@tiptap/react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Annotation } from "../extensions/Annotation";
import { Indent } from "../extensions/Indent";
import { useDebounce } from "../../../hooks/useDebounce";
import type { Leaf } from "../types";

const DEBOUNCE_MS = 800;
const SAVE_STATUS_IDLE_MS = 2000;

interface UseEditorContentParams {
  leaf: Leaf | undefined;
  updateLeaf: (data: {
    title: string;
    content: string;
    rawText: string;
  }) => Promise<unknown>;
  editorStatus: {
    show: () => void;
    hide: () => void;
    setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
    setLastUpdate: (timestamp: string) => void;
  };
}

interface UseEditorContentReturn {
  editor: Editor | null;
  localTitle: string;
  setLocalTitle: React.Dispatch<React.SetStateAction<string>>;
  localContent: string;
  localRawText: string;
  contentReady: boolean;
  flushSave: () => Promise<void>;
}

export function useEditorContent({
  leaf,
  updateLeaf,
  editorStatus,
}: UseEditorContentParams): UseEditorContentReturn {
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localRawText, setLocalRawText] = useState("");

  const initialSyncDoneRef = useRef(false);
  const serverContentRef = useRef("");
  const lastSavedRef = useRef({ title: "", content: "" });
  const saveInFlightRef = useRef(false);
  const [contentReady, setContentReady] = useState(false);

  // Refs para acesso aos valores mais recentes em event listeners (beforeunload, etc.)
  const latestValuesRef = useRef({ title: "", content: "", rawText: "" });

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      Indent.configure({
        types: ["paragraph", "heading", "blockquote"],
        maxLevel: 4,
        indentStep: 1.5,
      }),
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
    [editorStatus],
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

  // Força os estilos de quebra de texto diretamente via JS no DOM do ProseMirror
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view?.dom as HTMLElement | undefined;
    if (!editorDom) return;

    Object.assign(editorDom.style, {
      overflowWrap: "break-word",
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    });
  }, [editor]);

  // Sync inicial: carrega o conteúdo do servidor para o editor
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
  }, [leaf, editor, editorStatus]);

  // Mantém latestValuesRef atualizado
  useEffect(() => {
    latestValuesRef.current = { title: localTitle, content: localContent, rawText: localRawText };
  }, [localTitle, localContent, localRawText]);

  /** Salva imediatamente sem esperar debounce */
  const flushSave = useCallback(async () => {
    const { title, content, rawText } = latestValuesRef.current;
    if (!initialSyncDoneRef.current || !title || title.length === 0) return;

    const lastSaved = lastSavedRef.current;
    if (title === lastSaved.title && content === lastSaved.content) return;
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    editorStatus.setSaveStatus("saving");

    try {
      await updateLeaf({ title, content, rawText });
      lastSavedRef.current = { title, content };
      editorStatus.setLastUpdate(new Date().toISOString());
      editorStatus.setSaveStatus("saved");
    } catch (err) {
      editorStatus.setSaveStatus("error");
      const errorMessage = extractApiError(err, "Erro ao salvar. Tente novamente.");
      useToastStore.getState().addToast(errorMessage, "error");
    } finally {
      saveInFlightRef.current = false;
    }
  }, [updateLeaf, editorStatus]);

  // ── Salvar ao perder foco (mudar de aba) ou desmontar (navegação) ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Salva imediatamente ao desmontar o componente (navegação interna)
      flushSave();
    };
  }, [flushSave]);

  const debouncedTitle = useDebounce(localTitle, DEBOUNCE_MS);
  const debouncedContent = useDebounce(localContent, DEBOUNCE_MS);
  const debouncedRawText = useDebounce(localRawText, DEBOUNCE_MS);

  // Auto-save com debounce: salva quando o usuário para de digitar
  useEffect(() => {
    if (!initialSyncDoneRef.current) return;
    // Impede salvar com título vazio (servidor rejeita com @MinLength(1))
    if (!debouncedTitle || debouncedTitle.length === 0) return;

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

          // Volta ao status "idle" após 2s
          setTimeout(() => {
            editorStatus.setSaveStatus("idle");
          }, SAVE_STATUS_IDLE_MS);
        })
        .catch((err) => {
          startTransition(() => {
            editorStatus.setSaveStatus("error");
          });
          const errorMessage = extractApiError(err, "Erro ao salvar. Tente novamente.");
          useToastStore.getState().addToast(errorMessage, "error");
        })
        .finally(() => {
          saveInFlightRef.current = false;
        });
    }
  }, [debouncedTitle, debouncedContent, debouncedRawText, updateLeaf, editorStatus]);

  return {
    editor,
    localTitle,
    setLocalTitle,
    localContent,
    localRawText,
    contentReady,
    flushSave,
  };
}
