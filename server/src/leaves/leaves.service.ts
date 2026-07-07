import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EditHistoryService } from '../trash/edit-history.service';
import { buildTree } from '../prisma/utils/build-tree.util';

@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly editHistory: EditHistoryService,
  ) {}

  private async verifyLeafOwnership(leafId: string, userId: string) {
    const leaf = await this.prisma.leaf.findUnique({
      where: { id: leafId },
      include: { notebook: true },
    });

    if (!leaf) return { leaf: null, error: 'Folha não encontrada' };
    if (leaf.notebook.userId !== userId) {
      return { leaf: null, error: 'Acesso negado' };
    }

    return { leaf, error: null };
  }

  async findByNotebook(notebookId: string, userId: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId, deletedAt: null },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    return this.prisma.leaf.findMany({
      where: { notebookId, parentId: null, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            children: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });
  }

  async findOne(leafId: string, userId: string) {
    const { leaf, error } = await this.verifyLeafOwnership(leafId, userId);
    if (error) {
      if (error === 'Acesso negado') throw new ForbiddenException(error);
      throw new NotFoundException(error);
    }

    const leafWithParents = await this.prisma.leaf.findUnique({
      where: { id: leafId },
      include: {
        notebook: true,
        parent: {
          include: {
            parent: true,
          },
        },
        children: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    return leafWithParents;
  }

  async create(
    notebookId: string,
    userId: string,
    data: { title: string; content?: string; rawText?: string; parentId?: string },
  ) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    if (data.title.length > 100) {
      throw new BadRequestException('Título muito longo (máx. 100 caracteres)');
    }

    if (data.parentId) {
      const parentLeaf = await this.prisma.leaf.findFirst({
        where: { id: data.parentId, notebookId },
      });
      if (!parentLeaf) throw new NotFoundException('Folha pai não encontrada');
    }

    const leaf = await this.prisma.leaf.create({
      data: {
        notebookId,
        title: data.title,
        content: data.content || '',
        rawText: data.rawText || '',
        parentId: data.parentId || null,
      },
    });

    await this.editHistory.record(userId, {
      leafId: leaf.id,
      notebookId,
      action: 'created',
      fieldName: 'title',
      newValue: data.title,
    });

    return leaf;
  }

  async update(
    leafId: string,
    userId: string,
    data: {
      title?: string;
      content?: string;
      rawText?: string;
      summary?: string | null;
      parentId?: string | null;
    },
  ) {
    const { leaf, error } = await this.verifyLeafOwnership(leafId, userId);
    if (error) {
      if (error === 'Acesso negado') throw new ForbiddenException(error);
      throw new NotFoundException(error);
    }

    const updated = await this.prisma.leaf.update({
      where: { id: leafId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.rawText !== undefined && { rawText: data.rawText }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });

    if (data.title !== undefined && data.title !== leaf?.title) {
      await this.editHistory.record(userId, {
        leafId,
        notebookId: leaf!.notebookId,
        action: 'updated',
        fieldName: 'title',
        oldValue: leaf?.title,
        newValue: data.title,
      });
    }

    return updated;
  }

  async generateSummary(leafId: string, userId: string) {
    const { leaf, error } = await this.verifyLeafOwnership(leafId, userId);
    if (error) {
      if (error === 'Acesso negado') throw new ForbiddenException(error);
      throw new NotFoundException(error);
    }

    const cleanTitle = leaf!.title;
    const cleanText = leaf!.rawText || 'Sem conteúdo adicional.';

    const summaryText = `### Resumo da Aula: ${cleanTitle}\n\nEste resumo foi gerado dinamicamente pela inteligência artificial com base nas notas fornecidas.\n\n- **Conceito Principal**: Foco em ${cleanTitle}.\n- **Ideias Chave**:\n  1. A importância de reter os conceitos práticos e relacioná-los a exemplos do cotidiano.\n  2. Uso de revisões sistemáticas para evitar a curva do esquecimento de Ebbinghaus.\n- **Conteúdo Analisado**:\n  > "${cleanText.substring(0, 150)}${cleanText.length > 150 ? '...' : ''}"\n\n*Utilize os flashcards associados para testar sua memória ativa!*`;

    const updated = await this.prisma.leaf.update({
      where: { id: leafId },
      data: { summary: summaryText },
    });

    await this.editHistory.record(userId, {
      leafId,
      notebookId: leaf!.notebookId,
      action: 'updated',
      fieldName: 'summary',
      newValue: summaryText,
    });

    return { summary: updated.summary! };
  }

  async generateFlashcards(leafId: string, userId: string) {
    const { leaf, error } = await this.verifyLeafOwnership(leafId, userId);
    if (error) {
      if (error === 'Acesso negado') throw new ForbiddenException(error);
      throw new NotFoundException(error);
    }

    const now = new Date();
    const mockCards = [
      {
        id: crypto.randomUUID(),
        leafId: leaf!.id,
        notebookId: leaf!.notebookId,
        front: `Qual é o tema principal abordado na folha "${leaf!.title}"?`,
        back: `O tema principal é "${leaf!.title}", focado em aprofundar e consolidar este conteúdo de forma sistemática.`,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: now,
      },
      {
        id: crypto.randomUUID(),
        leafId: leaf!.id,
        notebookId: leaf!.notebookId,
        front: `De acordo com as notas de "${leaf!.title}", qual é uma boa prática de estudo para este tema?`,
        back: 'Escrever resumos com as próprias palavras e fazer exercícios práticos/simulados logo em seguida.',
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: now,
      },
      {
        id: crypto.randomUUID(),
        leafId: leaf!.id,
        notebookId: leaf!.notebookId,
        front: `Qual a importância da repetição espaçada no aprendizado de "${leaf!.title}"?`,
        back: 'Ela ajuda a combater a curva do esquecimento, movendo a informação da memória de curto prazo para a de longo prazo.',
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: now,
      },
    ];

    for (const card of mockCards) {
      await this.prisma.flashcard.create({ data: card });
    }

    await this.editHistory.record(userId, {
      leafId,
      notebookId: leaf!.notebookId,
      action: 'created',
      fieldName: 'flashcards',
      newValue: `${mockCards.length} flashcards gerados por IA`,
    });

    return mockCards;
  }

  async findFlashcards(leafId: string, userId: string) {
    const { error } = await this.verifyLeafOwnership(leafId, userId);
    if (error) {
      if (error === 'Acesso negado') throw new ForbiddenException(error);
      throw new NotFoundException(error);
    }

    return this.prisma.flashcard.findMany({
      where: { leafId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeafHierarchy(notebookId: string, userId: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    const allLeaves = await this.prisma.leaf.findMany({
      where: { notebookId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    return buildTree(allLeaves);
  }
}

