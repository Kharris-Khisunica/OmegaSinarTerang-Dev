import { HttpException, HttpStatus } from '@nestjs/common';

export interface StepUpRequiredBody {
  requiresAuthorization: true;
  authorizationRequestId: string;
  message: string;
}

/**
 * Satu-satunya tempat yang membentuk body+status HTTP untuk "aksi ini butuh
 * step-up". Dipakai StepUpGuard (Hari 5) DAN StepUpService (Hari 9) supaya
 * bentuk responsnya identik byte-per-byte, bukan cuma "kelihatan sama" —
 * frontend cukup satu jalur penanganan (CLAUDE.md §13).
 *
 * Kode status: 412 Precondition Failed (BUKAN 428 Precondition Required yang
 * dipakai implementasi Hari 5 — diseragamkan ke 412 sesuai CLAUDE.md §13/§5).
 */
export function stepUpRequiredException(
  authorizationRequestId: string,
  message: string,
): HttpException {
  const body: StepUpRequiredBody = {
    requiresAuthorization: true,
    authorizationRequestId,
    message,
  };
  return new HttpException(body, HttpStatus.PRECONDITION_FAILED);
}
