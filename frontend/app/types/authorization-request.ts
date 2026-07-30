export type AuthorizationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED'

export interface AuthorizationRequest {
  id: string
  requesterId: string
  approverId: string | null
  actionType: string
  payload: Record<string, unknown>
  contextSummary: string
  status: AuthorizationRequestStatus
  reason: string | null
  expiresAt: string
  approvedAt: string | null
  executedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Body 412 dari StepUpGuard maupun StepUpService — kontrak identik keduanya (backend step-up-response.ts). */
export interface StepUpErrorBody {
  requiresAuthorization: true
  authorizationRequestId: string
  message: string
}
