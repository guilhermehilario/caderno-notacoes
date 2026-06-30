import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Play,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useLeaf } from '../hooks/useLeaves';
import { useLeafFlashcards } from '../../study/hooks/useFlashcards';
import { useDebounce } from '../../../hooks/useDebounce';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export const EditorView: React.FC = () => {
  const { notebookId, leafId } = useParams<{ notebookId: string; leafId: string }>();
  const navigate = useNavigate();

  const {
    leaf,
    isLoading: isLoadingLeaf,
    updateLeaf,
    generateAISummary,
    isGeneratingSummary,
    generateAIFlashcards,
    isGeneratingFlashcards,
  } = useLeaf(leafId || '');

  const { data: flashcards = [] } = useLeafFlashcards(leafId || '');

  // Estados locais para inputs editáveis do usuário
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards'>('summary');

  // Debounce dos valores para salvamento automático
  const debouncedTitle = useDebounce(localTitle, 1500);
  const debouncedContent = useDebounce(localContent, 1500);

  // Evita salvar no primeiro render
  const isFirstRender = useRef(true);

  // Carrega dados da folha ao inicializar
  useEffect(() => {
    if (leaf) {
      setLocalTitle(leaf.title);
      setLocalContent(leaf.content);
      isFirstRender.current = true;
    }
  }, [leaf]);

  // Efeito de auto-salvamento para o título e conteúdo
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const performAutoSave = async () => {
      setSaveStatus('saving');
      try {
        await updateLeaf({
          title: debouncedTitle,
          content: debouncedContent,
          rawText: debouncedContent, // Simplificado: usa o conteúdo plano no rascunho
        });
        setSaveStatus('saved');
      } catch (error) {
        console.error('Erro no auto-save:', error);
        setSaveStatus('error');
      }
    };

    // Só dispara se os valores locais forem diferentes dos valores salvos da API
    if (leaf && (debouncedTitle !== leaf.title || debouncedContent !== leaf.content)) {
      performAutoSave();
    }
  }, [debouncedTitle, debouncedContent, leaf, updateLeaf]);

  const handleGenerateSummary = async () => {
    if (!leafId) return;
    try {
      await generateAISummary();
    } catch (err) {
      console.error('Erro ao gerar resumo:', err);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!leafId) return;
    try {
      await generateAIFlashcards();
    } catch (err) {
      console.error('Erro ao gerar flashcards:', err);
    }
  };

  if (isLoadingLeaf) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <RefreshCw className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!leaf) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-bold">Folha de anotação não encontrada</h3>
        <Link to={`/notebooks/${notebookId}`} className="text-brand-500 hover:underline">
          Voltar para o caderno
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-150 dark:border-dark-800 pb-3 flex-shrink-0">
        <Link
          to={`/notebooks/${notebookId}`}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Caderno
        </Link>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-500">
              <Check className="h-3.5 w-3.5" /> Salvo
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-brand-500">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-rose-500">
              <AlertTriangle className="h-3.5 w-3.5" /> Falha ao salvar rascunho
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
              setSaveStatus('saving');
            }}
            placeholder="Título da folha..."
            className="w-full text-2xl font-heading font-extrabold tracking-tight bg-transparent text-slate-900 dark:text-dark-50 placeholder-slate-350 focus:outline-none mb-6 border-b border-transparent focus:border-slate-100 dark:focus:border-dark-800 pb-2 transition-all"
          />

          <textarea
            value={localContent}
            onChange={(e) => {
              setLocalContent(e.target.value);
              setSaveStatus('saving');
            }}
            placeholder="Comece a digitar o conteúdo da sua aula aqui..."
            className="w-full flex-grow bg-transparent text-slate-750 dark:text-dark-100 placeholder-slate-400 focus:outline-none resize-none overflow-y-auto leading-relaxed text-base"
          />
        </div>

        {/* Lado Direito - Painel de IA */}
        <div className="w-full lg:w-[450px] flex flex-col bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-3xl overflow-hidden flex-shrink-0 min-h-0">
          {/* Abas */}
          <div className="flex border-b border-slate-100 dark:border-dark-800/60 flex-shrink-0 bg-slate-50 dark:bg-dark-950/20">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-4 text-center font-heading font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
                activeTab === 'summary'
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700'
              }`}
            >
              Resumo por IA
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex-1 py-4 text-center font-heading font-bold text-sm tracking-wide transition-all border-b-2 cursor-pointer ${
                activeTab === 'flashcards'
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-slate-500 dark:text-dark-400 hover:text-slate-700'
              }`}
            >
              Flashcards ({flashcards.length})
            </button>
          </div>

          {/* Painel Interno */}
          <div className="flex-grow p-6 overflow-y-auto min-h-0">
            {activeTab === 'summary' && (
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
                        Escreva suas anotações no editor e clique abaixo para gerar um resumo inteligente estruturado pela nossa IA.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateSummary}
                      isLoading={isGeneratingSummary}
                      leftIcon={<Sparkles className="h-4.5 w-4.5" />}
                      disabled={!localContent.trim()}
                    >
                      Gerar Resumo por IA
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'flashcards' && (
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
                        Deixe que a inteligência artificial formule perguntas e respostas de fixação baseadas nos seus textos.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateFlashcards}
                      isLoading={isGeneratingFlashcards}
                      leftIcon={<Sparkles className="h-4.5 w-4.5" />}
                      disabled={!localContent.trim()}
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
                        onClick={() => navigate(`/notebooks/${notebookId}/study`)}
                        leftIcon={<Play className="h-3.5 w-3.5" />}
                      >
                        Estudar Agora
                      </Button>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
                      {flashcards.map((card) => (
                        <Card key={card.id} className="p-4 bg-slate-50/50 dark:bg-dark-950/30 border border-slate-100 dark:border-dark-850 flex flex-col gap-2.5">
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
export default EditorView;
