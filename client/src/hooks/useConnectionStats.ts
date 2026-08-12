import { useState, useCallback } from 'react';
import type { QualityMetrics, QualityAssessment, QualityHistorySample } from '../types/stats.js';

export function useConnectionStats() {
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [qualityAssessment, setQualityAssessment] = useState<QualityAssessment>({
    rating: 'Unavailable',
    color: 'var(--text-muted)',
    summary: 'Collecting connection statistics...',
  });
  const [qualityHistory, setQualityHistory] = useState<QualityHistorySample[]>([]);

  const handleMetricsUpdate = useCallback(
    (metrics: QualityMetrics, assessment: QualityAssessment, history: QualityHistorySample[]) => {
      setQualityMetrics(metrics);
      setQualityAssessment(assessment);
      setQualityHistory(history);
    },
    []
  );

  const resetStats = useCallback(() => {
    setQualityMetrics(null);
    setQualityAssessment({
      rating: 'Unavailable',
      color: 'var(--text-muted)',
      summary: 'Collecting connection statistics...',
    });
    setQualityHistory([]);
  }, []);

  return {
    qualityMetrics,
    qualityAssessment,
    qualityHistory,
    handleMetricsUpdate,
    resetStats,
  };
}
