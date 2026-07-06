import { api } from '../../../core/api/client';

export interface EditHistoryEntry {
  id: string;
  userId: string;
  leafId: string | null;
  notebookId: string | null;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  leaf?: { title: string } | null;
  notebook?: { title: string } | null;
}

export const historyService = {
  async getLeafHistory(leafId: string): Promise<EditHistoryEntry[]> {
    const response = await api.get<EditHistoryEntry[]>(`/history/leaves/${leafId}`);
    return response.data;
  },

  async getNotebookHistory(notebookId: string): Promise<EditHistoryEntry[]> {
    const response = await api.get<EditHistoryEntry[]>(`/history/notebooks/${notebookId}`);
    return response.data;
  },

  async getRecentActivity(): Promise<EditHistoryEntry[]> {
    const response = await api.get<EditHistoryEntry[]>('/history/recent');
    return response.data;
  },
};

export default historyService;
