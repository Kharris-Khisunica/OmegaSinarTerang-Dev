import type { AuthorizationRequest } from '~/types/authorization-request'

/**
 * Panggilan API authorization_requests (CLAUDE.md §6: satu jalur lewat useApi()).
 * Dipakai halaman Antrian Persetujuan (MASTER/SUPERVISOR) dan useStepUp() (operator).
 */
export function useAuthorizationRequests() {
  const api = useApi()

  return {
    listPending: () => api.get<AuthorizationRequest[]>('/authorization-requests'),
    getOne: (id: string) => api.get<AuthorizationRequest>(`/authorization-requests/${id}`),
    approve: (id: string) => api.post<AuthorizationRequest>(`/authorization-requests/${id}/approve`),
    reject: (id: string, reason: string) =>
      api.post<AuthorizationRequest>(`/authorization-requests/${id}/reject`, { reason })
  }
}
