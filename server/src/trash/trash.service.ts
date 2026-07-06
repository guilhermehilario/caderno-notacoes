import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar itens na lixeira ──
  async findAll(userId: string) {
    const [notebooks, leaves] = await Promise.all([
      this.prisma.notebook.findMany({
        where: { userId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          _count: { select: { leaves: true, flashcards: true } },
        },
      }),
      this.prisma.leaf.findMany({
        where: {
          notebook: { userId },
          deletedAt: { not: null },
        },
        orderBy: { deletedAt: 'desc' },
        include: {
          notebook: { select: { title: true, color: true } },
          _count: { select: { flashcards: true } },
        },
      }),
    ]);

    return {
      notebooks: notebooks.map((nb) => ({
        id: nb.id,
        title: nb.title,
        type: 'notebook' as const,
        deletedAt: nb.deletedAt!,
        color: nb.color,
        description: nb.description,
        leavesCount: nb._count.leaves,
        flashcardsCount: nb._count.flashcards,
      })),
      leaves: leaves.map((leaf) => ({
        id: leaf.id,
        title: leaf.title,
        type: 'leaf' as const,
        deletedAt: leaf.deletedAt!,
        notebookTitle: leaf.notebook.title,
        notebookColor: leaf.notebook.color,
        flashcardsCount: leaf._count.flashcards,
      })),
    };
  }

  // ── Mover notebook para lixeira (soft-delete) ──
  async softDeleteNotebook(notebookId: string, userId: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    const now = new Date();
    await this.prisma.notebook.update({
      where: { id: notebookId },
      data: { deletedAt: now },
    });

    // Soft-delete all leaves, flashcards, etc. of this notebook
    await this.prisma.leaf.updateMany({
      where: { notebookId },
      data: { deletedAt: now },
    });

    return { message: 'Caderno movido para lixeira', deletedAt: now };
  }

  // ── Mover folha para lixeira (soft-delete) ──
  async softDeleteLeaf(leafId: string, userId: string) {
    const leaf = await this.prisma.leaf.findUnique({
      where: { id: leafId },
      include: { notebook: true },
    });
    if (!leaf) throw new NotFoundException('Folha não encontrada');
    if (leaf.notebook.userId !== userId) throw new NotFoundException('Acesso negado');

    const now = new Date();
    await this.prisma.leaf.update({
      where: { id: leafId },
      data: { deletedAt: now },
    });

    return { message: 'Folha movida para lixeira', deletedAt: now };
  }

  // ── Restaurar notebook da lixeira ──
  async restoreNotebook(notebookId: string, userId: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId, deletedAt: { not: null } },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado na lixeira');

    await this.prisma.notebook.update({
      where: { id: notebookId },
      data: { deletedAt: null },
    });

    // Restore all soft-deleted leaves
    await this.prisma.leaf.updateMany({
      where: { notebookId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    return { message: 'Caderno restaurado da lixeira' };
  }

  // ── Restaurar folha da lixeira ──
  async restoreLeaf(leafId: string, userId: string) {
    const leaf = await this.prisma.leaf.findUnique({
      where: { id: leafId },
      include: { notebook: true },
    });
    if (!leaf) throw new NotFoundException('Folha não encontrada');
    if (leaf.notebook.userId !== userId) throw new NotFoundException('Acesso negado');
    if (!leaf.deletedAt) throw new NotFoundException('Folha não está na lixeira');

    await this.prisma.leaf.update({
      where: { id: leafId },
      data: { deletedAt: null },
    });

    return { message: 'Folha restaurada da lixeira' };
  }

  // ── Excluir permanentemente (apagar da lixeira) ──
  async permanentDeleteNotebook(notebookId: string, userId: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId, deletedAt: { not: null } },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado na lixeira');

    await this.prisma.notebook.delete({ where: { id: notebookId } });
    return { message: 'Caderno excluído permanentemente' };
  }

  async permanentDeleteLeaf(leafId: string, userId: string) {
    const leaf = await this.prisma.leaf.findUnique({
      where: { id: leafId },
      include: { notebook: true },
    });
    if (!leaf) throw new NotFoundException('Folha não encontrada');
    if (leaf.notebook.userId !== userId) throw new NotFoundException('Acesso negado');
    if (!leaf.deletedAt) throw new NotFoundException('Folha não está na lixeira');

    await this.prisma.leaf.delete({ where: { id: leafId } });
    return { message: 'Folha excluída permanentemente' };
  }

  // ── Limpar lixeira (excluir itens com mais de 15 dias) ──
  async cleanOldTrash(userId: string) {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const [oldNotebooks, oldLeaves] = await Promise.all([
      this.prisma.notebook.findMany({
        where: { userId, deletedAt: { lte: fifteenDaysAgo } },
        select: { id: true },
      }),
      this.prisma.leaf.findMany({
        where: {
          notebook: { userId },
          deletedAt: { lte: fifteenDaysAgo },
        },
        select: { id: true },
      }),
    ]);

    await Promise.all([
      ...oldNotebooks.map((nb) =>
        this.prisma.notebook.delete({ where: { id: nb.id } }),
      ),
      ...oldLeaves.map((leaf) =>
        this.prisma.leaf.delete({ where: { id: leaf.id } }),
      ),
    ]);

    return {
      deletedNotebooks: oldNotebooks.length,
      deletedLeaves: oldLeaves.length,
      message: `Lixeira limpa: ${oldNotebooks.length} cadernos e ${oldLeaves.length} folhas excluídos permanentemente`,
    };
  }
}
