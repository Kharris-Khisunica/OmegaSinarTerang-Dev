-- =====================================================================
-- Migration SQL v2 — Website Operasional FMCG (B2B Grosir)
-- Menggantikan Migration_SQL_Fase_1-4_Website_Operasional_FMCG.sql
-- Pendamping Development_Plan_v2_Website_Operasional_FMCG.md
--
-- Urutan sudah memperhitungkan dependency FK — jalankan top-to-bottom.
-- Split sesuai komentar "MIGRATION NNN:" kalau mau jadi file TypeORM terpisah.
--
-- PERUBAHAN UTAMA DARI v1:
--   + 11 tabel baru (settings, document_counters, payment_batch_methods,
--     agents, vehicles, delivery_orders(+lines), sales_returns(+lines),
--     purchase_returns(+lines))
--   + customers.is_pkp, warehouses BAD_STOCK, purchase_invoices.
--     supplier_invoice_number/discount_amount/receipt_date,
--     sales_invoices.due_date/rounding_amount, payment_batches.agent_id/
--     vehicle_id, authorization_requests.expires_at
--   - products.tax_status (status pajak kini di customer)
--   - payment_batches.payment_account_id (pindah ke payment_batch_methods)
--   - seed COA "Kas"/"Bank" generik (diinput manual Master)
--   - seed COA "Retur Pembelian" (tidak tepat di sistem perpetual)
--   ~ stock_cost_lots.unit_cost -> NUMERIC(16,4)
--   ~ CHECK journal line diperketat
--   + trigger updated_at generik
-- =====================================================================


-- =====================================================================
-- MIGRATION 001: Ekstensi & utilitas (Hari 1)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trigger generik updated_at.
-- Dipasang ke semua tabel yang punya updated_at, karena sebagian update
-- dilakukan lewat raw SQL (mis. decrement stock_cost_lots.qty_remaining
-- dengan FOR UPDATE) yang tidak melewati TypeORM @UpdateDateColumn.
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- MIGRATION 002: Settings & penomoran dokumen (Hari 3)
-- =====================================================================
CREATE TABLE settings (
  key         VARCHAR(50) PRIMARY KEY,
  value       TEXT NOT NULL,
  value_type  VARCHAR(10) NOT NULL DEFAULT 'string'
              CHECK (value_type IN ('string','number','boolean')),
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

INSERT INTO settings (key, value, value_type, description) VALUES
  ('company_is_pkp',       'false',    'boolean', 'Status PKP toko. false = tidak memungut PPN sama sekali, apa pun status customer'),
  ('tax_calculation_mode', 'exclude',  'string',  'exclude = harga + PPN. include = harga sudah termasuk PPN'),
  ('rounding_multiple',    '100',      'number',  'Kelipatan pembulatan ke atas di Sales Invoice (Rupiah)'),
  ('backdate_max_days',    '2',        'number',  'Maksimum mundur tanggal transaksi (hari)');

-- Penomoran reset per bulan, format PREFIX/YYMM/NNNN.
-- TIDAK memakai CREATE SEQUENCE karena sequence tidak bisa reset per periode.
-- Ambil nomor selalu dengan SELECT ... FOR UPDATE di dalam transaction pemanggil.
CREATE TABLE document_counters (
  doc_type    VARCHAR(20) NOT NULL,
  period      VARCHAR(4)  NOT NULL,          -- 'YYMM', mis. '2609'
  last_number INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (doc_type, period)
);
COMMENT ON TABLE document_counters IS
  'doc_type: INV, SO, PI, SJ, RJ, RB, PAY, JE. Reset otomatis karena period jadi bagian PK.';


-- =====================================================================
-- MIGRATION 003: Users & Auth (Hari 2)
-- =====================================================================
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username            VARCHAR(50) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  full_name           VARCHAR(150) NOT NULL,
  role                VARCHAR(20) NOT NULL CHECK (role IN ('OPERATOR','SUPERVISOR','MASTER')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  refresh_token_hash  VARCHAR(255),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Seed 3 user development (password = username, bcrypt asli, sudah divalidasi
-- bisa login memakai bcrypt/bcryptjs Node.js).
-- !! WAJIB DIGANTI SEBELUM GO-LIVE — lihat Checklist Go-Live §8 plan v2 !!
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('master',     '$2b$10$ZZ6GRMs4UmvmL0e17SYJ5OR/.peVX.OgrHCULXQBcZPYiR.xKLvz2', 'Master (dev seed)',     'MASTER'),
  ('supervisor', '$2b$10$fw6yXlT1gdCNAPIbSu/TT.Z2OYKYQUJOAApbNKXAmyOg6qyzX7ari', 'Supervisor (dev seed)', 'SUPERVISOR'),
  ('operator',   '$2b$10$Ju3doFUrsffllNUkRMPsauDwYLrfN9i2Inq4oUtxAK9IYg..qFrYC', 'Operator (dev seed)',   'OPERATOR');


-- =====================================================================
-- MIGRATION 004: Chart of Accounts (Hari 3)
-- Dibuat sebelum customers karena customers.ar_account_id butuh FK ke sini.
-- =====================================================================
CREATE TABLE chart_of_accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               VARCHAR(20) UNIQUE NOT NULL,
  name               VARCHAR(150) NOT NULL,
  account_type       VARCHAR(20) NOT NULL
                     CHECK (account_type IN ('ASET','LIABILITAS','EKUITAS','PENDAPATAN','BEBAN')),
  parent_id          UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  normal_balance     VARCHAR(6) NOT NULL CHECK (normal_balance IN ('DEBIT','KREDIT')),
  is_cash_account    BOOLEAN NOT NULL DEFAULT false,   -- true = boleh dipilih sebagai kas/bank pembayaran
  is_system_default  BOOLEAN NOT NULL DEFAULT false,   -- proteksi akun seed dari hapus
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coa_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX idx_coa_account_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_is_cash ON chart_of_accounts(is_cash_account) WHERE is_cash_account = true;
CREATE TRIGGER trg_coa_updated BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Seed COA minimal.
-- CATATAN: akun Kas & Bank SENGAJA TIDAK di-seed — diinput manual Master
-- (Kas Besar, Kas Kecil, Kas Toko, Bank BCA, Bank BSI, Bank Mandiri)
-- dengan is_cash_account = true. Ini PRASYARAT GO-LIVE: tanpa minimal satu
-- akun kas, pembayaran & biaya operasional tidak bisa diinput.
--
-- CATATAN: akun "Retur Pembelian" DIHAPUS dari v1. Sistem ini memakai
-- persediaan perpetual, jadi retur pembelian dijurnal langsung
-- Hutang (D) / Persediaan (K). Visibilitas retur didapat dari dokumen
-- purchase_returns yang bernomor, bukan dari akun kontra.
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, is_system_default) VALUES
  ('1-1200', 'Piutang Usaha',             'ASET',       'DEBIT',  true),
  ('1-1300', 'Persediaan Barang Dagang',  'ASET',       'DEBIT',  true),
  ('1-1400', 'PPN Masukan',               'ASET',       'DEBIT',  true),
  ('2-1000', 'Hutang Usaha',              'LIABILITAS', 'KREDIT', true),
  ('2-1100', 'PPN Keluaran',              'LIABILITAS', 'KREDIT', true),
  ('3-1000', 'Modal',                     'EKUITAS',    'KREDIT', true),
  ('4-1000', 'Pendapatan Penjualan',      'PENDAPATAN', 'KREDIT', true),
  ('4-1100', 'Retur Penjualan',           'PENDAPATAN', 'DEBIT',  true),  -- kontra-pendapatan
  ('4-1200', 'Pendapatan Pembulatan',     'PENDAPATAN', 'KREDIT', true),
  ('5-1000', 'Harga Pokok Penjualan',     'BEBAN',      'DEBIT',  true),
  ('5-2000', 'Beban Operasional',         'BEBAN',      'DEBIT',  true);


-- =====================================================================
-- MIGRATION 005: Master data (Hari 3)
-- =====================================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  contact_phone   VARCHAR(30),
  contact_address TEXT,
  is_pkp          BOOLEAN NOT NULL DEFAULT false,   -- dormant selama settings.company_is_pkp = false
  ar_account_id   UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,  -- null = pakai Piutang Usaha umum
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_ar_account_id ON customers(ar_account_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_code    VARCHAR(20) UNIQUE NOT NULL,   -- auto-generate, selalu tampil semua role
  name            VARCHAR(200) NOT NULL,         -- di-mask dari Operator di DTO layer
  contact_phone   VARCHAR(30),                   -- di-mask
  contact_address TEXT,                          -- di-mask
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Kode supplier TIDAK reset per bulan, jadi sequence biasa sudah cukup.
CREATE SEQUENCE supplier_code_seq START 1;

CREATE OR REPLACE FUNCTION fn_set_supplier_display_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_code IS NULL THEN
    NEW.display_code := 'SUP-' || LPAD(nextval('supplier_code_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_supplier_display_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_set_supplier_display_code();

CREATE TABLE warehouses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100) NOT NULL,
  warehouse_type VARCHAR(20) NOT NULL DEFAULT 'STORE'
                 CHECK (warehouse_type IN ('STORE','CUSTOMER_CONSIGNMENT','BAD_STOCK')),
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  is_default     BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (warehouse_type = 'CUSTOMER_CONSIGNMENT' AND customer_id IS NOT NULL) OR
    (warehouse_type <> 'CUSTOMER_CONSIGNMENT' AND customer_id IS NULL)
  )
);
CREATE INDEX idx_warehouses_customer_id ON warehouses(customer_id);
CREATE INDEX idx_warehouses_type ON warehouses(warehouse_type);
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON COLUMN warehouses.warehouse_type IS
  'STORE & BAD_STOCK = persediaan milik perusahaan, mutasi ke sini MENCATAT stock_movements transfer. '
  'CUSTOMER_CONSIGNMENT = barang sudah dibeli customer, mutasi TIDAK menyentuh stock_movements.';

INSERT INTO warehouses (name, warehouse_type, is_default) VALUES
  ('Gudang Toko',      'STORE',     true),
  ('Gudang Bad Stock', 'BAD_STOCK', false);

CREATE TABLE products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku        VARCHAR(50) UNIQUE NOT NULL,
  name       VARCHAR(200) NOT NULL,
  base_unit  VARCHAR(20) NOT NULL,           -- satuan terbesar, mis. 'dus'
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_name ON products(name);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- CATATAN: kolom tax_status DIHAPUS dari v1. Status pajak sepenuhnya
-- ditentukan customers.is_pkp + settings.company_is_pkp.
-- CATATAN: tidak ada kolom harga jual — harga diinput manual per transaksi
-- (keputusan klien). price-suggestion adalah satu-satunya jaring pengaman.

CREATE TABLE product_unit_conversions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name      VARCHAR(20) NOT NULL,
  conversion_qty NUMERIC(14,4) NOT NULL CHECK (conversion_qty > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, unit_name)
);
CREATE INDEX idx_puc_product_id ON product_unit_conversions(product_id);
CREATE TRIGGER trg_puc_updated BEFORE UPDATE ON product_unit_conversions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON COLUMN product_unit_conversions.conversion_qty IS
  'Jumlah unit_name yang setara 1 base_unit. Mis. 1 dus = 20 renceng -> conversion_qty = 20. '
  'Konversi ke base: qty_base = qty_input / conversion_qty.';

CREATE TABLE tax_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate           NUMERIC(5,4) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to   DATE,
  description    VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tax_rates_effective ON tax_rates(effective_from, effective_to);
CREATE TRIGGER trg_tax_rates_updated BEFORE UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Tarif PPN sengaja di sini, BUKAN di settings, supaya invoice historis
-- tetap tercetak dengan tarif yang berlaku saat itu.
-- !! KONFIRMASI TARIF YANG BENAR KE KONSULTAN PAJAK SEBELUM GO-LIVE !!
INSERT INTO tax_rates (rate, effective_from, description) VALUES
  (0.1100, CURRENT_DATE, 'PPN 11% (seed default — WAJIB dikonfirmasi ke konsultan pajak)');

CREATE TABLE agents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  plate_number  VARCHAR(20) UNIQUE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =====================================================================
-- MIGRATION 006: Otorisasi step-up (Hari 5)
-- =====================================================================
CREATE TABLE authorization_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by   UUID NOT NULL REFERENCES users(id),
  approved_by    UUID REFERENCES users(id),
  action_type    VARCHAR(50) NOT NULL,          -- mis. 'VOID_SALES_INVOICE'
  reference_type VARCHAR(30) NOT NULL,
  reference_id   UUID NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','APPROVED','REJECTED','EXECUTED','EXPIRED')),
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,                   -- diisi saat APPROVED: now() + 15 menit
  note           TEXT
);
CREATE INDEX idx_authreq_status ON authorization_requests(status);
CREATE INDEX idx_authreq_reference ON authorization_requests(reference_type, reference_id);

COMMENT ON COLUMN authorization_requests.expires_at IS
  'Guard wajib menolak eksekusi kalau now() > expires_at. Mencegah approval lama dipakai belakangan.';


-- =====================================================================
-- MIGRATION 007: Jurnal (Hari 6)
-- =====================================================================
CREATE TABLE journal_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number      VARCHAR(30) UNIQUE NOT NULL,   -- JE/YYMM/NNNN
  entry_date        DATE NOT NULL,
  description       VARCHAR(255) NOT NULL,
  reference_type    VARCHAR(30) NOT NULL,          -- 'sales_invoice','purchase_invoice','payment_batch',
                                                   -- 'operational_expense','sales_return','purchase_return',
                                                   -- 'manual','opening_balance','void_reversal'
  reference_id      UUID,                          -- null untuk jurnal manual murni
  is_reversal       BOOLEAN NOT NULL DEFAULT false,
  reversed_entry_id UUID REFERENCES journal_entries(id),
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_je_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_je_entry_date ON journal_entries(entry_date);

CREATE TABLE journal_entry_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount     NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (debit_amount  >= 0),
  credit_amount    NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Diperketat dari v1: constraint lama (debit=0 OR credit=0) masih
  -- meloloskan baris 0/0. Ini mewajibkan tepat satu sisi bernilai > 0.
  CHECK ((debit_amount > 0) <> (credit_amount > 0))
);
CREATE INDEX idx_jel_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account_id ON journal_entry_lines(account_id);

COMMENT ON TABLE journal_entry_lines IS
  'Invariant SUM(debit) = SUM(credit) per journal_entry_id divalidasi di Journal Poster, bukan di DB.';


-- =====================================================================
-- MIGRATION 008: Stok & FIFO (Hari 7)
-- =====================================================================
CREATE TABLE stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  movement_type  VARCHAR(30) NOT NULL
                 CHECK (movement_type IN ('purchase_in','sale_out','return_to_supplier',
                                          'return_from_customer','adjustment_damage',
                                          'transfer','opening_balance')),
  qty_base_unit  NUMERIC(14,4) NOT NULL,       -- signed: positif = masuk, negatif = keluar
  reference_type VARCHAR(30) NOT NULL,
  reference_id   UUID NOT NULL,
  unit_cost      NUMERIC(16,4),                -- masuk: cost basis. keluar: hasil FIFO
  note           TEXT,
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_product_warehouse ON stock_movements(product_id, warehouse_id);
CREATE INDEX idx_sm_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_sm_created_at ON stock_movements(created_at);

COMMENT ON TABLE stock_movements IS
  'IMMUTABLE / append-only. Koreksi selalu lewat movement pembalik baru, tidak pernah UPDATE/DELETE.';

CREATE TABLE product_stock_balance (
  product_id    UUID NOT NULL REFERENCES products(id),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id),
  qty_base_unit NUMERIC(14,4) NOT NULL DEFAULT 0,   -- BOLEH negatif (keputusan klien)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id)
);
COMMENT ON TABLE product_stock_balance IS
  'Cache, bukan source of truth. Rekonsiliasi dari SUM(stock_movements) lewat endpoint admin.';

CREATE TABLE stock_cost_lots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               UUID NOT NULL REFERENCES products(id),
  warehouse_id             UUID NOT NULL REFERENCES warehouses(id),
  source_stock_movement_id UUID NOT NULL REFERENCES stock_movements(id),
  qty_in                   NUMERIC(14,4) NOT NULL,
  qty_remaining            NUMERIC(14,4) NOT NULL CHECK (qty_remaining >= 0),
  unit_cost                NUMERIC(16,4) NOT NULL,   -- 4 desimal: nilai total lot harus cocok saldo GL Persediaan
  lot_date                 DATE NOT NULL,            -- = tanggal TERIMA BARANG, bukan tanggal invoice
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- KRITIKAL untuk query "ambil lot tertua yang masih bersisa"
CREATE INDEX idx_scl_product_wh_date ON stock_cost_lots(product_id, warehouse_id, lot_date)
  WHERE qty_remaining > 0;
CREATE TRIGGER trg_scl_updated BEFORE UPDATE ON stock_cost_lots
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE stock_cost_consumptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id                      UUID NOT NULL REFERENCES stock_cost_lots(id),
  consuming_stock_movement_id UUID NOT NULL REFERENCES stock_movements(id),
  qty_consumed                NUMERIC(14,4) NOT NULL,
  unit_cost                   NUMERIC(16,4) NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scc_lot_id ON stock_cost_consumptions(lot_id);
CREATE INDEX idx_scc_movement_id ON stock_cost_consumptions(consuming_stock_movement_id);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  before_data JSONB,
  after_data  JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_al_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_al_user_id ON audit_logs(user_id);
CREATE INDEX idx_al_created_at ON audit_logs(created_at);

COMMENT ON TABLE audit_logs IS
  'WAJIB strip field password/token/hash dari before_data & after_data sebelum insert.';


-- =====================================================================
-- MIGRATION 009: Mutasi gudang (Hari 10)
-- =====================================================================
CREATE TABLE warehouse_mutations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id),
  from_warehouse_id  UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  qty                NUMERIC(14,4) NOT NULL CHECK (qty > 0),   -- di base_unit
  creates_movement   BOOLEAN NOT NULL,                          -- true kalau tujuan STORE/BAD_STOCK
  note               TEXT,
  created_by         UUID NOT NULL REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_warehouse_id <> to_warehouse_id)
);
CREATE INDEX idx_wm_product_id ON warehouse_mutations(product_id);
CREATE INDEX idx_wm_from_wh ON warehouse_mutations(from_warehouse_id);
CREATE INDEX idx_wm_to_wh ON warehouse_mutations(to_warehouse_id);
CREATE INDEX idx_wm_created_at ON warehouse_mutations(created_at);

COMMENT ON COLUMN warehouse_mutations.creates_movement IS
  'false = tujuan CUSTOMER_CONSIGNMENT (Lapisan 2 murni, tanpa stock_movements). '
  'true  = tujuan STORE/BAD_STOCK (mencatat 2 baris stock_movements transfer, lot ikut pindah).';


-- =====================================================================
-- MIGRATION 010: Pembelian (Hari 11)
-- =====================================================================
CREATE TABLE purchase_invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number          VARCHAR(30) UNIQUE NOT NULL,   -- PI/YYMM/NNNN (internal)
  supplier_invoice_number VARCHAR(50),                   -- nomor faktur dari supplier, format bebas
  supplier_id             UUID NOT NULL REFERENCES suppliers(id),
  invoice_date            DATE NOT NULL,                 -- dasar tanggal JURNAL
  receipt_date            DATE NOT NULL,                 -- dasar lot_date FIFO
  subtotal_amount         NUMERIC(16,2) NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(16,2) NOT NULL DEFAULT 0,  -- dialokasikan proporsional ke unit_cost tiap baris
  tax_amount              NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_amount            NUMERIC(16,2) NOT NULL DEFAULT 0,  -- TANPA pembulatan (harus persis = nota supplier)
  paid_amount             NUMERIC(16,2) NOT NULL DEFAULT 0,
  status                  VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
  journal_entry_id        UUID REFERENCES journal_entries(id),
  void_journal_entry_id   UUID REFERENCES journal_entries(id),
  created_by              UUID NOT NULL REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pi_supplier_id ON purchase_invoices(supplier_id);
CREATE INDEX idx_pi_status ON purchase_invoices(status);
CREATE INDEX idx_pi_invoice_date ON purchase_invoices(invoice_date);
CREATE INDEX idx_pi_supplier_inv_no ON purchase_invoices(supplier_invoice_number);
CREATE TRIGGER trg_pi_updated BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE purchase_invoice_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id),
  qty                 NUMERIC(14,4) NOT NULL,
  unit                VARCHAR(20) NOT NULL,
  qty_base_unit       NUMERIC(14,4) NOT NULL,
  unit_cost           NUMERIC(16,4) NOT NULL,   -- setelah alokasi diskon, jadi cost basis lot FIFO
  is_taxable          BOOLEAN NOT NULL DEFAULT false,
  tax_rate            NUMERIC(5,4) NOT NULL DEFAULT 0,
  subtotal            NUMERIC(16,2) NOT NULL,
  tax_amount          NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_line          NUMERIC(16,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pil_purchase_invoice_id ON purchase_invoice_lines(purchase_invoice_id);
CREATE INDEX idx_pil_product_id ON purchase_invoice_lines(product_id);

CREATE TABLE goods_receipts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id),
  receipt_date        DATE NOT NULL,
  note                TEXT,
  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gr_purchase_invoice_id ON goods_receipts(purchase_invoice_id);
CREATE INDEX idx_gr_warehouse_id ON goods_receipts(warehouse_id);
CREATE TRIGGER trg_gr_updated BEFORE UPDATE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE goods_receipt_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  qty              NUMERIC(14,4) NOT NULL,
  unit             VARCHAR(20) NOT NULL,
  qty_base_unit    NUMERIC(14,4) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_grl_goods_receipt_id ON goods_receipt_lines(goods_receipt_id);
CREATE INDEX idx_grl_product_id ON goods_receipt_lines(product_id);


-- =====================================================================
-- MIGRATION 011: Retur pembelian (Hari 13)
-- =====================================================================
CREATE TABLE purchase_returns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number       VARCHAR(30) UNIQUE NOT NULL,   -- RB/YYMM/NNNN
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  return_date         DATE NOT NULL,
  settlement_type     VARCHAR(20) NOT NULL CHECK (settlement_type IN ('REDUCE_INVOICE','CASH')),
  cash_account_id     UUID REFERENCES chart_of_accounts(id),   -- wajib bila settlement_type = 'CASH'
  total_amount        NUMERIC(16,2) NOT NULL DEFAULT 0,
  reason              TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
  journal_entry_id    UUID REFERENCES journal_entries(id),
  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (settlement_type <> 'CASH' OR cash_account_id IS NOT NULL)
);
CREATE INDEX idx_pr_purchase_invoice_id ON purchase_returns(purchase_invoice_id);
CREATE INDEX idx_pr_supplier_id ON purchase_returns(supplier_id);
CREATE INDEX idx_pr_return_date ON purchase_returns(return_date);
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON purchase_returns
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE purchase_return_lines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id),
  qty                NUMERIC(14,4) NOT NULL,
  unit               VARCHAR(20) NOT NULL,
  qty_base_unit      NUMERIC(14,4) NOT NULL,
  unit_cost          NUMERIC(16,4) NOT NULL,   -- harga pokok lot asal
  subtotal           NUMERIC(16,2) NOT NULL,
  tax_amount         NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_line         NUMERIC(16,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prl_purchase_return_id ON purchase_return_lines(purchase_return_id);
CREATE INDEX idx_prl_product_id ON purchase_return_lines(product_id);


-- =====================================================================
-- MIGRATION 012: Biaya operasional (Hari 14)
-- =====================================================================
CREATE TABLE operational_expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date          DATE NOT NULL,
  description           VARCHAR(255) NOT NULL,
  amount                NUMERIC(16,2) NOT NULL CHECK (amount > 0),
  expense_account_id    UUID NOT NULL REFERENCES chart_of_accounts(id),
  payment_account_id    UUID NOT NULL REFERENCES chart_of_accounts(id),
  journal_entry_id      UUID REFERENCES journal_entries(id),
  void_journal_entry_id UUID REFERENCES journal_entries(id),
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','VOID')),
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oe_expense_date ON operational_expenses(expense_date);
CREATE INDEX idx_oe_status ON operational_expenses(status);
CREATE TRIGGER trg_oe_updated BEFORE UPDATE ON operational_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE operational_expenses IS
  'Ongkos angkut pembelian diinput di sini (keputusan klien: dibayar terpisah, tidak masuk harga pokok).';


-- =====================================================================
-- MIGRATION 013: Sales Order (Hari 16)
-- =====================================================================
CREATE TABLE sales_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number   VARCHAR(30) UNIQUE NOT NULL,   -- SO/YYMM/NNNN
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_date  DATE NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONVERTED','VOID')),
  note        TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_so_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- CATATAN: status 'CONFIRMED' dari v1 DIHAPUS — tidak ada endpoint confirm.

CREATE TABLE sales_order_lines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  qty            NUMERIC(14,4) NOT NULL,
  unit           VARCHAR(20) NOT NULL,
  unit_price     NUMERIC(16,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sol_sales_order_id ON sales_order_lines(sales_order_id);
CREATE INDEX idx_sol_product_id ON sales_order_lines(product_id);
CREATE TRIGGER trg_sol_updated BEFORE UPDATE ON sales_order_lines
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =====================================================================
-- MIGRATION 014: Sales Invoice (Hari 17)
-- =====================================================================
CREATE TABLE sales_invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number        VARCHAR(30) UNIQUE NOT NULL,   -- INV/YYMM/NNNN
  customer_id           UUID NOT NULL REFERENCES customers(id),
  sales_order_id        UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  invoice_date          DATE NOT NULL,
  due_date              DATE,                          -- disiapkan, TANPA UI di MVP
  subtotal_amount       NUMERIC(16,2) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(16,2) NOT NULL DEFAULT 0,
  rounding_amount       NUMERIC(16,2) NOT NULL DEFAULT 0,   -- pembulatan ke atas -> Pendapatan Pembulatan
  total_amount          NUMERIC(16,2) NOT NULL DEFAULT 0,   -- SUDAH dibulatkan
  paid_amount           NUMERIC(16,2) NOT NULL DEFAULT 0,
  status                VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
  journal_entry_id      UUID REFERENCES journal_entries(id),
  void_journal_entry_id UUID REFERENCES journal_entries(id),
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_si_customer_id ON sales_invoices(customer_id);
CREATE INDEX idx_si_status ON sales_invoices(status);
CREATE INDEX idx_si_invoice_date ON sales_invoices(invoice_date);
CREATE INDEX idx_si_outstanding ON sales_invoices(customer_id, invoice_date)
  WHERE status = 'POSTED' AND paid_amount < total_amount;
CREATE TRIGGER trg_si_updated BEFORE UPDATE ON sales_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE sales_invoice_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  qty              NUMERIC(14,4) NOT NULL,
  unit             VARCHAR(20) NOT NULL,
  qty_base_unit    NUMERIC(14,4) NOT NULL,
  unit_price       NUMERIC(16,2) NOT NULL,   -- input manual, sebelum pajak
  is_taxable       BOOLEAN NOT NULL DEFAULT false,
  tax_rate         NUMERIC(5,4) NOT NULL DEFAULT 0,
  subtotal         NUMERIC(16,2) NOT NULL,
  tax_amount       NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_line       NUMERIC(16,2) NOT NULL,
  unit_cost_fifo   NUMERIC(16,4),            -- hasil FIFO; WAJIB dipakai saat retur penjualan
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sil_sales_invoice_id ON sales_invoice_lines(sales_invoice_id);
CREATE INDEX idx_sil_product_id ON sales_invoice_lines(product_id);
-- Dipakai price-suggestion: 3-5 harga terakhir customer+produk
CREATE INDEX idx_sil_product_created ON sales_invoice_lines(product_id, created_at DESC);


-- =====================================================================
-- MIGRATION 015: Retur penjualan (Hari 20)
-- =====================================================================
CREATE TABLE sales_returns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number    VARCHAR(30) UNIQUE NOT NULL,   -- RJ/YYMM/NNNN
  sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  return_date      DATE NOT NULL,
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id),   -- selalu Gudang Toko (keputusan klien)
  settlement_type  VARCHAR(20) NOT NULL CHECK (settlement_type IN ('REDUCE_INVOICE','CASH')),
  cash_account_id  UUID REFERENCES chart_of_accounts(id),     -- wajib bila 'CASH'
  total_amount     NUMERIC(16,2) NOT NULL DEFAULT 0,
  reason           TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (settlement_type <> 'CASH' OR cash_account_id IS NOT NULL)
);
CREATE INDEX idx_sr_sales_invoice_id ON sales_returns(sales_invoice_id);
CREATE INDEX idx_sr_customer_id ON sales_returns(customer_id);
CREATE INDEX idx_sr_return_date ON sales_returns(return_date);
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON sales_returns
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON COLUMN sales_returns.settlement_type IS
  'CASH menutup kasus retur atas invoice yang SUDAH LUNAS — dominan di kanal toko '
  'karena pembeli toko bayar seketika. Tanpa ini paid_amount bisa melebihi total_amount.';

CREATE TABLE sales_return_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  qty             NUMERIC(14,4) NOT NULL,
  unit            VARCHAR(20) NOT NULL,
  qty_base_unit   NUMERIC(14,4) NOT NULL,
  unit_price      NUMERIC(16,2) NOT NULL,   -- harga jual asli
  unit_cost_fifo  NUMERIC(16,4) NOT NULL,   -- HPP asli dari sales_invoice_lines, BUKAN harga baru
  subtotal        NUMERIC(16,2) NOT NULL,
  tax_amount      NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_line      NUMERIC(16,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_sales_return_id ON sales_return_lines(sales_return_id);
CREATE INDEX idx_srl_product_id ON sales_return_lines(product_id);


-- =====================================================================
-- MIGRATION 016: Surat jalan (Hari 21)
-- =====================================================================
CREATE TABLE delivery_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  do_number        VARCHAR(30) UNIQUE NOT NULL,   -- SJ/YYMM/NNNN
  sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  agent_id         UUID NOT NULL REFERENCES agents(id),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
  delivery_date    DATE NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','DELIVERED','POSTPONED','RETURNED')),
  note             TEXT,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_do_sales_invoice_id ON delivery_orders(sales_invoice_id);
CREATE INDEX idx_do_agent_date ON delivery_orders(agent_id, delivery_date);
CREATE INDEX idx_do_vehicle_date ON delivery_orders(vehicle_id, delivery_date);
CREATE INDEX idx_do_status ON delivery_orders(status);
CREATE TRIGGER trg_do_updated BEFORE UPDATE ON delivery_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON COLUMN delivery_orders.status IS
  'POSTPONED = toko customer tutup, diantar besok. Barang masih fisik di kendaraan '
  'tapi stok sistem sudah keluar sejak Sales Invoice dibuat. Kendaraan BELUM jadi gudang terlacak '
  '(keputusan klien: cukup status).';

CREATE TABLE delivery_order_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  qty               NUMERIC(14,4) NOT NULL,
  unit              VARCHAR(20) NOT NULL,
  qty_base_unit     NUMERIC(14,4) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dol_delivery_order_id ON delivery_order_lines(delivery_order_id);
CREATE INDEX idx_dol_product_id ON delivery_order_lines(product_id);


-- =====================================================================
-- MIGRATION 017: Pembayaran (Hari 23)
-- =====================================================================
CREATE TABLE payment_batches (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number           VARCHAR(30) UNIQUE NOT NULL,   -- PAY/YYMM/NNNN
  party_type             VARCHAR(10) NOT NULL CHECK (party_type IN ('CUSTOMER','SUPPLIER')),
  customer_id            UUID REFERENCES customers(id),
  supplier_id            UUID REFERENCES suppliers(id),
  agent_id               UUID REFERENCES agents(id),     -- kanal agen
  vehicle_id             UUID REFERENCES vehicles(id),   -- kanal agen, dasar rekap setoran
  payment_date           DATE NOT NULL,
  total_amount_input     NUMERIC(16,2) NOT NULL,
  total_amount_allocated NUMERIC(16,2) NOT NULL DEFAULT 0,
  status                 VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','VOID')),
  journal_entry_id       UUID REFERENCES journal_entries(id),
  void_journal_entry_id  UUID REFERENCES journal_entries(id),
  created_by             UUID NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (party_type = 'CUSTOMER' AND customer_id IS NOT NULL AND supplier_id IS NULL) OR
    (party_type = 'SUPPLIER' AND supplier_id IS NOT NULL AND customer_id IS NULL)
  )
);
CREATE INDEX idx_pb_customer_id ON payment_batches(customer_id);
CREATE INDEX idx_pb_supplier_id ON payment_batches(supplier_id);
CREATE INDEX idx_pb_payment_date ON payment_batches(payment_date);
CREATE INDEX idx_pb_vehicle_date ON payment_batches(vehicle_id, payment_date);
CREATE TRIGGER trg_pb_updated BEFORE UPDATE ON payment_batches
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- CATATAN: payment_account_id tunggal dari v1 DIHAPUS — pindah ke tabel ini,
-- karena satu pelunasan bisa pecah beberapa metode (mis. 30jt kas + 50jt transfer).
CREATE TABLE payment_batch_methods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_batch_id   UUID NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
  payment_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),   -- kas/bank
  amount             NUMERIC(16,2) NOT NULL CHECK (amount > 0),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pbm_batch_id ON payment_batch_methods(payment_batch_id);
CREATE INDEX idx_pbm_account_id ON payment_batch_methods(payment_account_id);

COMMENT ON TABLE payment_batch_methods IS
  'SUM(amount) per batch WAJIB = payment_batches.total_amount_input (divalidasi di service). '
  'Sisa yang tidak dibayar bukan metode — itu outstanding yang tetap di invoice.';

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_batch_id    UUID NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
  sales_invoice_id    UUID REFERENCES sales_invoices(id),
  purchase_invoice_id UUID REFERENCES purchase_invoices(id),
  allocated_amount    NUMERIC(16,2) NOT NULL CHECK (allocated_amount > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (sales_invoice_id IS NOT NULL AND purchase_invoice_id IS NULL) OR
    (sales_invoice_id IS NULL AND purchase_invoice_id IS NOT NULL)
  )
);
CREATE INDEX idx_pay_batch_id ON payments(payment_batch_id);
CREATE INDEX idx_pay_sales_invoice_id ON payments(sales_invoice_id);
CREATE INDEX idx_pay_purchase_invoice_id ON payments(purchase_invoice_id);

COMMENT ON TABLE payments IS
  'Alokasi default FIFO ke invoice tertua, TAPI WAJIB dapat diedit manual di layar konfirmasi. '
  'Kanal agen: uang yang dibawa pulang biasanya untuk pengiriman HARI INI, bukan tunggakan lama.';


-- =====================================================================
-- SELESAI — 39 tabel, 86 FK constraint, 23 trigger.
--
-- SUDAH DIVALIDASI jalan tanpa error di PostgreSQL 16.14. Smoke test lolos:
--   - seed: 3 user, 11 akun COA, 2 gudang, 4 setting, 1 tarif pajak
--   - trigger auto-code supplier -> SUP-001, SUP-002
--   - trigger updated_at naik saat UPDATE (bukan hanya saat INSERT)
--   - gudang CUSTOMER_CONSIGNMENT tanpa customer_id -> DITOLAK
--   - baris jurnal 0/0 -> DITOLAK (bug constraint v1 sudah tertutup)
--   - baris jurnal debit DAN kredit terisi -> DITOLAK
--   - mutasi ke gudang yang sama -> DITOLAK
--   - format nomor dokumen -> INV/2609/0001
--
-- PRASYARAT GO-LIVE yang TIDAK di-seed di file ini (disengaja):
--   1. Akun kas & bank (Kas Besar, Kas Kecil, Kas Toko, BCA, BSI, Mandiri)
--      dengan is_cash_account = true -> tanpa ini pembayaran & biaya
--      operasional tidak bisa diinput sama sekali.
--   2. Ganti password 3 user seed.
--   3. Konfirmasi tarif PPN ke konsultan pajak.
--   4. Saldo awal stok + harga terakhir lewat alur Saldo Awal.
--   5. Saldo awal kas & bank lewat Jurnal Manual.
--   6. Verifikasi: SUM(qty_remaining * unit_cost) seluruh lot = saldo GL Persediaan.
-- =====================================================================
