import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrash, useRestoreNotebook, useRestoreLeaf, usePermanentDeleteNotebook, usePermanentDeleteLeaf, useCleanTrash } from '../hooks/useTrash';
import { Trash2, RotateCcw, Loader2, ArrowLeft, BookOpen, FileText, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import type { TrashItem } from '../services/trashService';

export const TrashView: React.FC = () => {
  const { data: trash, isLoading } = useTrash();
  const restoreNotebook = useRestoreNotebook();
  const restoreLeaf = useRestoreLeaf();
  const permanentDeleteNotebook = usePermanentDeleteNotebook();
  const permanentDeleteLeaf = usePermanentDeleteLeaf();
  const cleanTrash = useCleanTrash();
  const navigate = useNavigate();

  const allItems = [
    ...(trash?.notebooks || []),
    ...(trash?.leaves || []),
  ].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
  );

  const handleRestore = async (item: TrashItem) => {
    try {
      if (item.type === 'notebook') {
        await restoreNotebook.mutateAsync(item.id);
      } else {
        await restoreLeaf.mutateAsync(item.id);
      }
    } catch (err) {
      console.error('Erro ao restaurar:', err);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    if (!window.confirm(`Excluir permanentemente "${item.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      if (item.type === 'notebook') {
        await permanentDeleteNotebook.mutateAsync(item.id);
      } else {
        await permanentDeleteLeaf.mutateAsync(item.id);
      }
    } catch (err) {
      console.error('Erro ao excluir permanentemente:', err);
    }
  };

  const handleCleanTrash = async () => {
    if (!window.confirm('Excluir permanentemente todos os itens com mais de 15 dias na lixeira?')) return;
    try {
      await cleanTrash.mutateAsync();
    } catch (err) {
      console.error('Erro ao limpar lixeira:', err);
    }
  };

  const getDaysLeft = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffMs = now.getTime() - deleted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return 15 - diffDays;
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-dark-300 hover:text-brand-500 transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-dark-50 flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-slate-400" />
            Lixeira
          </h1>
          <p className="text-slate-500 dark:text-dark-350 mt-1">
            Itens excluídos são mantidos por 15 dias antes da exclusão permanente
          </p>
        </div>
        {allItems.length > 0 && (
          <Button
            variant="outline"
            onClick={handleCleanTrash}
            disabled={cleanTrash.isPending}
            className="text-rose-500 border-rose-200 hover:bg-rose-50"
          >
            {cleanTrash.isPending ? 'Limpando...' : 'Limpar Lixeira (+15 dias)'}
          </Button>
        )}
      </div>

      {allItems.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center p-12 min-h-[30vh] border border-dashed border-slate-200 dark:border-dark-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-dark-800 flex items-center justify-center text-slate-400 mb-4">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="text-md font-heading font-bold text-slate-850 dark:text-dark-100">
            Lixeira vazia
          </h3>
          <p className="text-sm text-slate-500 dark:text-dark-350 mt-1 max-w-sm">
            Itens excluídos aparecerão aqui e serão permanentemente removidos após 15 dias.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {allItems.map((item) => {
            const daysLeft = getDaysLeft(item.deletedAt);
            return (
              <Card
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-4 p-4 border border-slate-100 dark:border-dark-800"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.type === 'notebook'
                    ? 'bg-slate-100 dark:bg-dark-800 text-slate-500'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                }`}>
                  {item.type === 'notebook' ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading font-bold truncate text-slate-800 dark:text-dark-50">
                      {item.title}
                    </h4>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      daysLeft <= 0
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                        : daysLeft <= 3
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-dark-800 dark:text-dark-400'
                    }`}>
                      {daysLeft <= 0 ? 'A ser excluído' : `${daysLeft} dias restantes`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-dark-400 mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Excluído em {new Date(item.deletedAt).toLocaleDateString('pt-BR')}
                    {item.type === 'leaf' && item.notebookTitle && (
                      <> · {item.notebookTitle}</>
                    )}
                    {item.flashcardsCount && item.flashcardsCount > 0 && (
                      <> · {item.flashcardsCount} flashcards</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                    title="Restaurar"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(item)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    title="Excluir permanentemente"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrashView;
