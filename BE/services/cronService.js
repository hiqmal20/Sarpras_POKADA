const cron = require('node-cron');
const supabase = require('../config/supabaseClient');

/**
 * Cron job: Notifikasi harian untuk peminjaman yang sudah lama belum dikembalikan
 * (lebih dari 7 hari sejak borrow_date)
 * Jalankan setiap hari pukul 08:00 WIB
 */
const startOverdueChecker = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Menjalankan pengecekan peminjaman lama...');

    try {
      // Gunakan tanggal pengembalian yang disepakati, bukan cutoff 7 hari tetap.
      const today = new Date().toISOString();

      // Ambil peminjaman aktif yang sudah melewati planned_return_date.
      const { data: longBorrowings, error } = await supabase
        .from('borrowings')
        .select('id, borrow_code, user_id, planned_return_date')
        .eq('status', 'Dipinjam')
        .not('planned_return_date', 'is', null)
        .lt('planned_return_date', today);

      if (error) {
        console.error('[CRON] Gagal mengambil data peminjaman:', error.message);
        return;
      }

      if (!longBorrowings || longBorrowings.length === 0) {
        console.log('[CRON] Tidak ada peminjaman yang perlu diingatkan.');
        return;
      }

      console.log(`[CRON] Mengirim ${longBorrowings.length} notifikasi pengingat pengembalian.`);

      // Kirim notifikasi pengingat ke masing-masing user
      const notifService = require('./notificationService');
      for (const b of longBorrowings) {
        try {
          await notifService.createNotification({
            user_id: b.user_id,
            title: 'Pengingat: Segera Kembalikan Barang',
            message: `Peminjaman dengan kode ${b.borrow_code} sudah melewati tanggal pengembalian yang direncanakan. Harap segera kembalikan barang ke petugas SARPRAS`,
            type: 'peminjaman',
            action_url: `/user/riwayat_peminjaman?code=${encodeURIComponent(b.borrow_code)}`,
            reference_id: b.id,
            reference_type: 'borrowing'
          });
        } catch (err) {
          console.error(`[CRON] Gagal kirim notif ke user ${b.user_id}:`, err.message);
        }
      }

      console.log(`[CRON] Berhasil memproses ${longBorrowings.length} notifikasi pengingat.`);
    } catch (err) {
      console.error('[CRON] Error tidak terduga:', err.message);
    }
  }, {
    timezone: 'Asia/Jakarta'
  });

  console.log('[CRON] Pengingat pengembalian aktif — berjalan setiap hari pukul 08:00 WIB');
};

module.exports = { startOverdueChecker };
