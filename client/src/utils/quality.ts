export type QualityRating = 'Good' | 'Fair' | 'Poor' | 'N/A';

export interface QualityAssessment {
  rating: QualityRating;
  cssClass: string;
}

/**
 * Returns documented quality ratings and CSS classes for WebRTC getStats metrics.
 * 
 * Thresholds:
 * - RTT: Good (<100ms), Fair (100-250ms), Poor (>250ms)
 * - Bitrate: Good (>=1500 kbps), Fair (500-1499 kbps), Poor (<500 kbps)
 * - Packets Lost: Good (<=5), Fair (6-25), Poor (>25)
 * - FPS: Good (>=24), Fair (15-23), Poor (<15)
 * - Jitter: Good (<=10ms), Fair (11-30ms), Poor (>30ms)
 */
export function getMetricQuality(
  metricName: 'rtt' | 'bitrate' | 'packetsLost' | 'fps' | 'jitter',
  value: number | null
): QualityAssessment {
  if (value === null || value === undefined || isNaN(value)) {
    return { rating: 'N/A', cssClass: 'rating-neutral' };
  }

  switch (metricName) {
    case 'rtt': {
      if (value < 100) return { rating: 'Good', cssClass: 'rating-good' };
      if (value <= 250) return { rating: 'Fair', cssClass: 'rating-fair' };
      return { rating: 'Poor', cssClass: 'rating-poor' };
    }
    case 'bitrate': {
      if (value >= 1500) return { rating: 'Good', cssClass: 'rating-good' };
      if (value >= 500) return { rating: 'Fair', cssClass: 'rating-fair' };
      return { rating: 'Poor', cssClass: 'rating-poor' };
    }
    case 'packetsLost': {
      if (value <= 5) return { rating: 'Good', cssClass: 'rating-good' };
      if (value <= 25) return { rating: 'Fair', cssClass: 'rating-fair' };
      return { rating: 'Poor', cssClass: 'rating-poor' };
    }
    case 'fps': {
      if (value >= 24) return { rating: 'Good', cssClass: 'rating-good' };
      if (value >= 15) return { rating: 'Fair', cssClass: 'rating-fair' };
      return { rating: 'Poor', cssClass: 'rating-poor' };
    }
    case 'jitter': {
      if (value <= 10) return { rating: 'Good', cssClass: 'rating-good' };
      if (value <= 30) return { rating: 'Fair', cssClass: 'rating-fair' };
      return { rating: 'Poor', cssClass: 'rating-poor' };
    }
    default:
      return { rating: 'N/A', cssClass: 'rating-neutral' };
  }
}
