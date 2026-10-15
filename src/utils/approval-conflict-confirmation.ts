import type { ApprovalConflictPrompt, ConflictAnalysis } from '../types';

export const APPROVAL_CONFLICT_EVENT = 'geomidia:approval-conflict';

export function requestApprovalConflictConfirmation(analysis: ConflictAnalysis): Promise<boolean> {
  return new Promise((resolve) => {
    const detail: ApprovalConflictPrompt = { ...analysis, resolve };
    window.dispatchEvent(new CustomEvent<ApprovalConflictPrompt>(APPROVAL_CONFLICT_EVENT, { detail }));
  });
}
