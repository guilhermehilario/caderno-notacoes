import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotebooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const notebooks = await this.prisma.notebook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(
      notebooks.map(async (nb) => {
        const leavesCount = await this.prisma.leaf.count({
          where: { notebookId: nb.id },
        });
        return { ...nb, leavesCount };
      }),
    );

    return enriched;
  }

  async findOne(id: string, userId: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id, userId },
    });

    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    const leavesCount = await this.prisma.leaf.count({
      where: { notebookId: id },
    });

    return { ...notebook, leavesCount };
  }

  async create(
    userId: string,
    data: { title: string; description?: string | null; color: string },
  ) {
    const notebook = await this.prisma.notebook.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        color: data.color,
      },
    });

    return { ...notebook, leavesCount: 0 };
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; description?: string | null; color?: string },
  ) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id, userId },
    });

    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    const updated = await this.prisma.notebook.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });

    const leavesCount = await this.prisma.leaf.count({
      where: { notebookId: id },
    });

    return { ...updated, leavesCount };
  }

  async remove(id: string, userId: string): Promise<void> {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id, userId },
    });

    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    // Cascade delete via Prisma relations (onDelete: Cascade)
    await this.prisma.notebook.delete({ where: { id } });
  }
}
