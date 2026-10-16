import { ProdDataSource } from './data-source.prod';

// Pemakaian: node dist/database/run-migrations.js [run|show|revert]
// Migrasi TIDAK pernah jalan otomatis saat backend start.
async function main(): Promise<void> {
  const command = process.argv[2] ?? 'run';
  if (!['run', 'show', 'revert'].includes(command)) {
    throw new Error(`Perintah tidak dikenal: ${command} (run | show | revert)`);
  }

  await ProdDataSource.initialize();
  try {
    if (command === 'show') {
      const pending = await ProdDataSource.showMigrations();
      console.log(
        pending
          ? 'Ada migrasi yang belum dijalankan.'
          : 'Semua migrasi sudah dijalankan.',
      );
    } else if (command === 'revert') {
      await ProdDataSource.undoLastMigration({ transaction: 'each' });
      console.log('Migrasi terakhir dibatalkan.');
    } else {
      const executed = await ProdDataSource.runMigrations({
        transaction: 'each',
      });
      console.log(
        executed.length === 0
          ? 'Tidak ada migrasi baru.'
          : `Berhasil menjalankan ${executed.length} migrasi.`,
      );
    }
  } finally {
    await ProdDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Migrasi gagal:', error);
  process.exit(1);
});
