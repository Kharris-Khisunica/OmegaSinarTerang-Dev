/**
 * Dilempar service saat sebuah authorization_request TIDAK bisa dipakai untuk
 * eksekusi (masih PENDING, sudah REJECTED/EXPIRED/EXECUTED, atau body request
 * tidak cocok dengan payload yang disetujui) — beda dengan error kepemilikan/
 * kecocokan aksi (403/400 biasa) karena kasus ini murni "belum/tidak lagi bisa
 * dipakai", yang oleh StepUpGuard/StepUpService diterjemahkan jadi HTTP 412
 * { requiresAuthorization: true } lewat stepUpRequiredException().
 */
export class StepUpNotReadyError extends Error {}

/**
 * Sub-kasus StepUpNotReadyError: status APPROVED dan belum kedaluwarsa, tapi
 * body request yang sedang dieksekusi TIDAK cocok dengan payload yang
 * disetujui Supervisor/Master (CLAUDE.md §19) — mis. approval Rp 1 juta
 * dipakai untuk mengeksekusi Rp 100 juta. Approval yang dipakai TIDAK
 * dikonsumsi kalau mismatch (masih APPROVED, siap dipakai untuk payload yang
 * benar-benar disetujui) — hanya ditangkap lewat instanceof
 * StepUpNotReadyError yang sama supaya frontend tetap satu jalur penanganan;
 * dibedakan jadi subclass murni untuk kejelasan kode & test.
 */
export class StepUpPayloadMismatchError extends StepUpNotReadyError {}
