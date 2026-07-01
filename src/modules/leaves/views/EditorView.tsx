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
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Play,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Annotation } from "../extensions/Annotation";
import { useLeaf } from "../hooks/useLeaves";
import { useLeafFlashcards } from "../../study/hooks/useFlashcards";
import { useDebounce } from "../../../hooks/useDebounce";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { EditorToolbar } from "../components/EditorToolbar";
import { EditorBubbleMenu } from "../components/EditorBubbleMenu";
import { AnnotationSidebar } from "../components/AnnotationSidebar";
import { EditorSkeleton } from "../components/EditorSkeleton";

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
  } = useLeaf(leafId || "");

  const { data: flashcards = [] } = useLeafFlashcards(leafId || "");

  // Estados locais para inputs editáveis do usuário
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localRawText, setLocalRawText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [activeTab, setActiveTab] = useState<
    "summary" | "flashcards" | "annotations"
  >("summary");

  // Ref que garante que a sincronização servidor→editor ocorra APENAS UMA VEZ
  // (no carregamento inicial da folha). Depois disso, o editor é a fonte da
  // verdade local e nenhum re-render subsequente sobrescreve o conteúdo.
  const initialSyncDoneRef = useRef(false);
  // Ref para rastrear o conteúdo que veio do servidor (usado para
  // distinguir atualizações do servidor de edições do usuário)
  const serverContentRef = useRef("");
  // Rastreia o último estado salvo no servidor para evitar saves duplicados
  const lastSavedRef = useRef({ title: "", content: "" });
  // Garante que o autosave seja serializado e não force re-renderes em cascata
  const saveInFlightRef = useRef(false);
  // Controla se o conteúdo já foi sincronizado com o editor
  const [contentReady, setContentReady] = useState(false);

  // Dispara abertura do AnnotationPopover para editar anotação existente
  const [annotationText, setAnnotationText] = useState<string | null>(null);
  const annotationTrigger = useMemo(
    () => (annotationText ? { text: annotationText } : null),
    [annotationText],
  );
  const pendingRAF = useRef<number | null>(null);

  // Estabiliza a lista de extensões
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // TipTap v3 StarterKit já inclui 'link' e 'underline' — desabilitamos
        // para evitar o erro "Duplicate extension names found: ['link', 'underline']"
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

  // Callback de atualização do editor: só atualiza estados LOCAIS
  // se a mudança veio do USUÁRIO (não do servidor)
  const handleEditorUpdate = useCallback(
    ({ editor: ed }: { editor: Editor }) => {
      const currentHtml = ed.getHTML();
      // Se o conteúdo atual do editor é IGUAL ao último conteúdo recebido do servidor,
      // significa que foi o próprio sync effect que disparou este update — ignoramos.
      if (currentHtml === serverContentRef.current) return;

      setLocalContent(currentHtml);
      setLocalRawText(ed.getText());
    },
    [],
  );

  // Editor TipTap
  const editor = useEditor({
    extensions,
    content: "",
    onUpdate: handleEditorUpdate,
    immediatelyRender: false,
  });

  // Detecta clique em texto anotado e abre o popover para edição
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

  // ═══════════════════════════════════════════════════════════════
  //  Sincronização ÚNICA: servidor → editor (apenas no 1º load)
  // ═══════════════════════════════════════════════════════════════
  // Este efeito executa UMA VEZ quando a leaf carrega e o editor
  // está pronto. Depois disso, `initialSyncDoneRef` é setado para
  // `true` e NUNCA MAIS o conteúdo do servidor sobrescreve o editor,
  // eliminando o loop de renderização que causava "Maximum update
  // depth exceeded" e o flicker de tela.
  useEffect(() => {
    if (!leaf || !editor || initialSyncDoneRef.current) return;

    const serverContent = leaf.content || "";
    serverContentRef.current = serverContent;
    lastSavedRef.current = { title: leaf.title, content: serverContent };

    // Aplica o conteúdo do servidor no editor TipTap
    editor.commands.setContent(serverContent);

    startTransition(() => {
      setLocalTitle(leaf.title);
      setLocalContent(serverContent);
      setLocalRawText(leaf.rawText || "");
      setContentReady(true);
    });

    initialSyncDoneRef.current = true;
  }, [leaf, editor]);

  // Debounce para autosave
  const debouncedTitle = useDebounce(localTitle, 1500);
  const debouncedContent = useDebounce(localContent, 1500);
  const debouncedRawText = useDebounce(localRawText, 1500);

  // Efeito de auto-salvamento — discreto, sem bloquear a UI
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
          startTransition(() => {
            setSaveStatus("saved");
          });
        })
        .catch(() => {
          startTransition(() => {
            setSaveStatus("error");
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

  // Exibe o skeleton enquanto carrega OU até o conteúdo estar sincronizado no editor
  // `leaf && !contentReady`: só espera o sync se a leaf existe (se for 404, cai no "not found")
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
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-150 dark:border-dark-800 pb-3 flex-shrink-0">
        <RouterLink
          to={`/notebooks/${notebookId}`}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Caderno
        </RouterLink>

        {/* ── Indicador de salvamento discreto e animado ── */}
        <div className="flex items-center gap-2 text-xs font-semibold select-none">
          {saveStatus === "saved" && (
            <span
              key="saved"
              className="flex items-center gap-1 text-emerald-500 animate-in fade-in duration-300"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Salvo</span>
            </span>
          )}
          {saveStatus === "saving" && (
            <span
              key="saving"
              className="flex items-center gap-1.5 text-brand-500"
            >
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-300 animate-pulse [animation-delay:300ms]" />
              </span>
              Salvando
            </span>
          )}
          {saveStatus === "error" && (
            <span
              key="error"
              className="flex items-center gap-1 text-rose-500 animate-in fade-in duration-300"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Falha ao salvar
            </span>
          )}
        </div>
      </div>

      {/* Split Pane Editor / IA */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Lado Esquerdo - Editor */}
        <div className="flex-grow flex flex-col bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-3xl p-6 min-w-0">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
              setSaveStatus("saving");
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
              className="w-full h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:text-base [&_.ProseMirror]:caret-slate-800 [&_.dark_.ProseMirror]:caret-dark-100 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_p:first-child]:mt-0 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-heading [&_.ProseMirror_h1]:font-extrabold [&_.ProseMirror_h1]:tracking-tight [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-slate-900 [&_.dark_.ProseMirror_h1]:text-dark-50 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-heading [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:tracking-tight [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:text-slate-800 [&_.dark_.ProseMirror_h2]:text-dark-100 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-heading [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:tracking-tight [&_.ProseMirror_h3]:mb-1.5 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-slate-700 [&_.dark_.ProseMirror_h3]:text-dark-200 [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1.5 [&_.ProseMirror_li_p]:my-0"
            />
          </div>
        </div>

        {/* Lado Direito - Painel de IA */}
        <div className="w-full lg:w-[450px] flex flex-col bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-3xl overflow-hidden flex-shrink-0 min-h-0">
          {/* Abas */}
          <div className="flex border-b border-slate-100 dark:border-dark-800/60 flex-shrink-0 bg-slate-50 dark:bg-dark-950/20">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-4 text-center font-heading font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
                activeTab === "summary"
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700"
              }`}
            >
              Resumo
            </button>
            <button
              onClick={() => setActiveTab("annotations")}
              className={`flex-1 py-4 text-center font-heading font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
                activeTab === "annotations"
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700"
              }`}
            >
              Anotações
            </button>
            <button
              onClick={() => setActiveTab("flashcards")}
              className={`flex-1 py-4 text-center font-heading font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
                activeTab === "flashcards"
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700"
              }`}
            >
              Flashcards ({flashcards.length})
            </button>
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
                        gerar um resumo inteligente estruturado pela nossa IA.
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
                {flashcards.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500">
                      <HelpCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-slate-800 dark:text-dark-100">
                        Nenhum flashcard gerado
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-dark-350 mt-1 max-w-xs">
                        Deixe que a inteligência artificial formule perguntas e
                        respostas de fixação baseadas nos seus textos.
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
          </div>
        </div>
      </div>
    </div>
  );
};
export default memo(EditorView);
