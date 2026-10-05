<script setup lang="ts">
// CLAUDE.md §0 menandai laporan penjualan/piutang/hutang/biaya operasional
// ditunda ke pasca-MVP. Penjualan/Piutang/Hutang (Hari 30) DIKERJAKAN SEKARANG
// atas instruksi user 03 Sep 2026 -- keputusan kerja, belum dikonfirmasi
// klien, pola sama desain skema Payment Hari 26 (lihat PROGRESS.md §1/§3).
// Rekap Kas Harian (Hari 31) EKSPLISIT TIDAK ikut daftar tunda (CLAUDE.md
// §0: "rekap kas harian" ada di daftar "yang tetap dibangun") -- pengganti
// cash opname yang dipotong. Laporan Biaya Operasional (Hari 32A, un-postponed
// bareng paket R10) SUDAH tersedia -- placeholder "Belum tersedia" dicabut.
// Tanpa `roles` = semua role login boleh lihat (matriks §5: Laporan ✅ semua
// role kecuali COA).
//
// R11/L1 (20 Sep 2026) -- SATU pengecualian: kartu Stok Opname disembunyikan
// untuk OPERATOR, pola penyaringan sama `links` di layouts/default.vue
// (kartu yang tidak boleh diakses TIDAK boleh tampil lalu menolak saat
// diklik -- kalau tidak, halaman itu sendiri sudah 403 lewat @Roles BE).
definePageMeta({ title: 'Laporan' })

const { activeRole } = useAuthUser()
const canViewStockOpname = computed(() => activeRole.value !== 'OPERATOR')
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UPageCard
        title="Kontinuitas Nomor Dokumen"
        description="Setiap nomor dari 0001 sampai terakhir terbit per jenis dokumen + periode -- VOID tetap tercatat dengan alasannya, nomor yang hilang ditandai merah."
        icon="i-lucide-list-ordered"
        to="/laporan/kontinuitas-dokumen"
      />
      <UPageCard
        title="Laporan Stok"
        description="Stok per produk saat ini: gudang Toko, Barang Rusak/Retur (BAD_STOCK), dan Total -- satuan ditampilkan pecahan."
        icon="i-lucide-boxes"
        to="/laporan/stok"
      />
      <UPageCard
        title="Laporan Barang Titipan"
        description="Barang yang sudah dibeli & dibayar pelanggan tapi belum diambil, dipecah per pelanggan penitip."
        icon="i-lucide-package-check"
        to="/laporan/titipan"
      />
      <UPageCard
        v-if="canViewStockOpname"
        title="Stok Opname"
        description="Worksheet hitung fisik vs stok sistem -- daftar titipan tampil sebagai penjelas selisih. Tidak disimpan."
        icon="i-lucide-clipboard-check"
        to="/laporan/stok-opname"
      />
      <UPageCard
        title="Laporan Penjualan"
        description="Per periode, dikelompokkan per pelanggan atau per salesman -- rekap kinerja, tanpa perhitungan komisi."
        icon="i-lucide-trending-up"
        to="/laporan/penjualan"
      />
      <UPageCard
        title="Laporan Piutang"
        description="Umur piutang per pelanggan, direkonsiliasi ke buku besar -- termasuk pelanggan berakun piutang custom."
        icon="i-lucide-wallet-cards"
        to="/laporan/piutang"
      />
      <UPageCard
        title="Laporan Hutang"
        description="Umur hutang per supplier dari faktur pembelian terbuka, dihitung dari jatuh tempo."
        icon="i-lucide-receipt-text"
        to="/laporan/hutang"
      />
      <UPageCard
        title="Rekap Kas Harian"
        description="Saldo awal, masuk, keluar, saldo akhir per akun kas/bank untuk satu tanggal -- pengganti cash opname."
        icon="i-lucide-banknote"
        to="/laporan/kas-harian"
      />
      <UPageCard
        title="Rekonsiliasi Stok"
        description="Pengecekan integritas ledger vs saldo sistem per produk+gudang -- selisih wajib 0. Titipan tampil sebagai konteks tambahan gudang Toko."
        icon="i-lucide-scale"
        to="/laporan/rekonsiliasi-stok"
      />
      <UPageCard
        title="Laporan Biaya Operasional"
        description="Rekap biaya operasional per akun untuk satu bulan -- Kasbon/Piutang Karyawan tidak ikut, itu bukan biaya."
        icon="i-lucide-bar-chart-3"
        to="/laporan/biaya-operasional"
      />
    </div>
  </div>
</template>
