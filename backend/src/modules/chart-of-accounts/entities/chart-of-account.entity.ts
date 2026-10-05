import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

// Seksi laporan (Hari 17A, docs/COA_USULAN.md §7) — lebih granular dari
// AccountType, dipakai memisahkan aset lancar/tetap/non-usaha dsb tanpa
// menebak dari awalan kode.
export enum AccountSubtype {
  CURRENT_ASSET = 'CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  ACCUMULATED_DEPRECIATION = 'ACCUMULATED_DEPRECIATION',
  NON_OPERATING_ASSET = 'NON_OPERATING_ASSET',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  NON_OPERATING_LIABILITY = 'NON_OPERATING_LIABILITY',
  EQUITY = 'EQUITY',
  CONTRA_EQUITY = 'CONTRA_EQUITY',
  REVENUE = 'REVENUE',
  CONTRA_REVENUE = 'CONTRA_REVENUE',
  COGS = 'COGS',
  SELLING_EXPENSE = 'SELLING_EXPENSE',
  ADMIN_EXPENSE = 'ADMIN_EXPENSE',
  OWNER_EXPENSE = 'OWNER_EXPENSE',
  OTHER_INCOME = 'OTHER_INCOME',
  OTHER_EXPENSE = 'OTHER_EXPENSE',
}

// CRUD penuh & endpoint ada di Hari 15 (plan v2). Entity ini hanya dipakai
// modul lain (mis. Customers) untuk validasi FK (ar_account_id, dsb).
@Entity('chart_of_accounts')
export class ChartOfAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({
    name: 'account_type',
    type: 'enum',
    enum: AccountType,
    enumName: 'account_type',
  })
  accountType: AccountType;

  @Column({ name: 'parent_id', nullable: true, type: 'uuid' })
  parentId: string | null;

  @Column({ name: 'is_cash_account', default: false })
  isCashAccount: boolean;

  @Column({ name: 'is_receivable_account', default: false })
  isReceivableAccount: boolean;

  // Menandai akun Persediaan/Hutang (CLAUDE.md §5, §3 Saldo Awal) — dipakai
  // JournalManualService (tolak jurnal manual ke akun bersub-ledger) dan
  // OpeningBalanceService (resolve akun tujuan tanpa hardcode kode akun).
  @Column({ name: 'is_inventory_account', default: false })
  isInventoryAccount: boolean;

  @Column({ name: 'is_payable_account', default: false })
  isPayableAccount: boolean;

  // Kolomnya sudah ada sejak migration 1785080602940 (PPN Masukan, kode
  // '1103') — sebelumnya hanya dibaca lewat AccountResolverService raw SQL,
  // tidak pernah dideklarasikan di entity karena belum ada CRUD yang
  // menulisinya. Ditambahkan Hari 18 supaya CRUD COA bisa mengedit flag ini.
  @Column({ name: 'is_input_vat_account', default: false })
  isInputVatAccount: boolean;

  // Kolomnya sudah ada sejak migration 1785080602943 (Selisih Retur
  // Pembelian, kode '5104') — pola sama isInputVatAccount di atas.
  @Column({ name: 'is_purchase_return_diff_account', default: false })
  isPurchaseReturnDiffAccount: boolean;

  // Hari 27 (CLAUDE.md §2.18 "Selisih Pembayaran") — akun 5103, dipakai dua
  // arah (piutang/hutang). Pola sama isPurchaseReturnDiffAccount di atas.
  @Column({ name: 'is_payment_diff_account', default: false })
  isPaymentDiffAccount: boolean;

  // Paket R7 (migration 1785080602967, akun '07.110.00005') — diskon faktur
  // pembelian (K5) sekarang baris jurnal kredit tersendiri, bukan larut ke
  // harga pokok. Pola sama isPurchaseReturnDiffAccount di atas.
  @Column({ name: 'is_purchase_discount_account', default: false })
  isPurchaseDiscountAccount: boolean;

  // 4 flag sisi penjualan (Hari 21, migration 1785080602953) — pola persis
  // isInputVatAccount di atas. account_subtype TIDAK unik untuk keempatnya
  // (lihat komentar migration), makanya butuh flag singular sendiri.
  @Column({ name: 'is_revenue_account', default: false })
  isRevenueAccount: boolean;

  @Column({ name: 'is_sales_discount_account', default: false })
  isSalesDiscountAccount: boolean;

  @Column({ name: 'is_cogs_account', default: false })
  isCogsAccount: boolean;

  @Column({ name: 'is_output_vat_account', default: false })
  isOutputVatAccount: boolean;

  // Retur Penjualan (Hari 23, migration 1785080602956) — akun '04.110.00002',
  // kontra pendapatan. Butuh flag singular sendiri karena account_subtype
  // CONTRA_REVENUE juga dipegang '04.110.00003' Diskon Penjualan.
  @Column({ name: 'is_sales_return_account', default: false })
  isSalesReturnAccount: boolean;

  // Dicentang MASTER untuk akun Kas Besar (CLAUDE.md §5 "Pengeluaran kas
  // besar") — dibaca StepUpService via operational-expenses untuk menentukan
  // apakah pengeluaran dari akun ini butuh approval Supervisor/Master.
  @Column({ name: 'requires_outflow_approval', default: false })
  requiresOutflowApproval: boolean;

  // Hari 32A (migration 1785080602972) — akun '06.110.00001' B. Gaji
  // Salesman. Dipakai OperationalExpensesService.findExpenseAccounts()/
  // resolveExpenseAccount() untuk menyaring dropdown & menolak submit
  // OPERATOR (defense in depth, pola sama supplier masking CLAUDE.md §3
  // "Lain-lain"). SENGAJA plain boolean (bukan SINGULAR_FLAGS) — boleh
  // dimiliki lebih dari satu akun kalau nanti bertambah.
  @Column({ name: 'restricted_to_master', default: false })
  restrictedToMaster: boolean;

  // Hari 32A (migration 1785080602972) — akun '01.120.00002' Piutang
  // Karyawan. Menggerbangi Kasbon: satu-satunya akun ASSET yang boleh lolos
  // OperationalExpensesService.resolveExpenseAccount() selain EXPENSE murni.
  // SENGAJA plain boolean (pola sama isReceivableAccount) — dipakai untuk
  // MEMVALIDASI akun yang sudah dipilih, bukan resolve tunggal.
  @Column({ name: 'is_employee_receivable_account', default: false })
  isEmployeeReceivableAccount: boolean;

  // Hari 17A (docs/COA_USULAN.md §7) — arah saldo normal akun. Akun kontra
  // (Retur Penjualan, Diskon Penjualan, Akum. Penyusutan, Prive) bersaldo
  // normal BERLAWANAN dengan AccountType-nya; tanpa kolom ini neraca dan
  // L/R tidak bisa disusun dari data.
  @Column({
    name: 'normal_balance',
    type: 'enum',
    enum: NormalBalance,
    enumName: 'normal_balance',
  })
  normalBalance: NormalBalance;

  // Seksi laporan — lihat AccountSubtype di atas.
  @Column({
    name: 'account_subtype',
    type: 'enum',
    enum: AccountSubtype,
    enumName: 'account_subtype',
  })
  accountSubtype: AccountSubtype;

  // Header (Grup/Kategori) tidak bisa dijurnal — JournalPosterService
  // menolaknya (validasi keenam, CLAUDE.md §2.6).
  @Column({ name: 'is_postable', default: true })
  isPostable: boolean;

  // Akun penyeimbang jurnal pembuka Saldo Awal (OpeningBalanceService) —
  // menggantikan resolve lewat account_type='EQUITY' yang pecah begitu
  // bagan punya lebih dari satu akun EQUITY aktif (COA_USULAN §7.2).
  @Column({ name: 'is_opening_balance_equity_account', default: false })
  isOpeningBalanceEquityAccount: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
