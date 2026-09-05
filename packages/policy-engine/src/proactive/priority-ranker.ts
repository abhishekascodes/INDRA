export function calculatePriorityScore(params: {
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  daysRemaining?: number;
  financialImpactInr?: number;
  isLegalMandate?: boolean;
}): number {
  let baseScore = 20;

  switch (params.urgency) {
    case 'CRITICAL':
      baseScore = 85;
      break;
    case 'HIGH':
      baseScore = 65;
      break;
    case 'MEDIUM':
      baseScore = 40;
      break;
    case 'LOW':
      baseScore = 15;
      break;
  }

  // Days remaining bonus: closer deadline -> higher priority
  if (params.daysRemaining !== undefined && params.daysRemaining >= 0) {
    if (params.daysRemaining <= 7) {
      baseScore += 15;
    } else if (params.daysRemaining <= 30) {
      baseScore += 10;
    } else if (params.daysRemaining <= 60) {
      baseScore += 5;
    }
  }

  // Financial magnitude bonus
  if (params.financialImpactInr && params.financialImpactInr > 0) {
    if (params.financialImpactInr >= 100000) {
      baseScore += 8;
    } else if (params.financialImpactInr >= 10000) {
      baseScore += 5;
    } else if (params.financialImpactInr >= 1000) {
      baseScore += 3;
    }
  }

  // Legal mandate bonus
  if (params.isLegalMandate) {
    baseScore += 5;
  }

  return Math.min(100, Math.max(1, baseScore));
}
