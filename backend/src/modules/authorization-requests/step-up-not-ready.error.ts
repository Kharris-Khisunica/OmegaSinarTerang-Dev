/**
 * Dilempar service saat sebuah authorization_request TIDAK bisa dipakai untuk
 * eksekusi (masih PENDING, sudah REJECTED/EXPIRED/EXECUTED) — beda dengan
 * error kepemilikan/kecocokan aksi (403/400 biasa) karena kasus ini murni
 * "belum/tidak lagi bisa dipakai", yang oleh StepUpGuard diterjemahkan jadi
 * HTTP 428 { requiresAuthorization: true }.
 */
export class StepUpNotReadyError extends Error {}
