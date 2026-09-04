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
      // Hitung 7 hari yang lalu
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString();

      // Ambil peminjaman yang statusnya 'Dipinjam' dan sudah lebih dari 7 hari
      const { data: longBorrowings, error } = await supabase
        .from('borrowings')
        .select('id, borrow_code, user_id, borrow_date')
        .eq('status', 'Dipinjam')
        .lt('borrow_date', cutoffDate);

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
      const now = new Date().toISOString();
      const notifications = longBorrowings.map(b => ({
        user_id: b.user_id,
        title: 'Pengingat: Segera Kembalikan Barang',
        message: `Peminjaman dengan kode ${b.borrow_code} sudah berjalan lebih dari 7 hari. Harap segera kembalikan barang ke petugas SARPRAS.`,
        type: 'peminjaman',
        is_read: false,
        created_at: now
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('[CRON] Gagal kirim notifikasi pengingat:', notifError.message);
      }

      console.log(`[CRON] Berhasil kirim ${longBorrowings.length} notifikasi pengingat.`);
    } catch (err) {
      console.error('[CRON] Error tidak terduga:', err.message);
    }
  }, {
    timezone: 'Asia/Jakarta'
  });

  console.log('[CRON] Pengingat pengembalian aktif — berjalan setiap hari pukul 08:00 WIB');
};

module.exports = { startOverdueChecker };
