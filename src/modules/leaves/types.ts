import { z } from 'zod';

export const LeafTagSchema = z.object({
  leafId: z.string().uuid(),
  tagId: z.string().uuid(),
  tag: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string(),
    color: z.string(),
    createdAt: z.string().datetime().or(z.date()),
  }),
});

export const LeafSchema = z.object({
  id: z.string().uuid(),
  notebookId: z.string().uuid(),
  title: z.string().min(1, 'O título da folha é obrigatório').max(100, 'Título muito longo'),
  content: z.string(), // HTML, Markdown ou JSON do editor rico
  rawText: z.string(), // Texto plano limpo para processamento de IA
  summary: z.string().optional().nullable(), // Resumo gerado pela IA
  parentId: z.string().uuid().nullable().optional(), // Para sub-folhas
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  children: z.array(z.lazy(() => LeafSchema)).optional().default([]),
  tags: z.array(LeafTagSchema).optional().default([]),
  parent: z.lazy(() => LeafSchema.omit({ children: true, tags: true, parent: true })).nullable().optional(),
});

export type Leaf = z.infer<typeof LeafSchema>;

export const CreateLeafSchema = z.object({
  title: z.string().min(1, 'O título da folha é obrigatório').max(100, 'Título muito longo'),
  content: z.string().optional(),
  rawText: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export type CreateLeafInput = z.infer<typeof CreateLeafSchema>;

export const UpdateLeafSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório').optional(),
  content: z.string().optional(),
  rawText: z.string().optional(),
  summary: z.string().optional().nullable(),
  parentId: z.string().uuid().nullable().optional(),
});

export type UpdateLeafInput = z.infer<typeof UpdateLeafSchema>;
