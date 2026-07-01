import { useQuery } from '@tanstack/react-query';
import studyService from '../services/studyService';
import type { StudyStats } from '../services/studyService';

export function useStudyStats() {
  return useQuery<StudyStats>({
    queryKey: ['study-stats'],
    queryFn: () => studyService.getStats(),
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export default useStudyStats;
