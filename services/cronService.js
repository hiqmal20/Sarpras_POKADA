const cron = require('node-cron');
const supabase = require('../config/supabaseClient');

/**
 * Cron job: Deteksi peminjaman yang sudah melewati planned_return_date
 * Jalankan setiap hari pukul 00:05 WIB
 */
const startOverdueChecker = () => {
  cron.schedule('5 0 * * *', async () => {
    console.log('[CRON] Menjalankan pengecekan peminjaman terlambat...');

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Ambil semua peminjaman yang statusnya 'Dipinjam' dan sudah lewat batas pengembalian
      const { data: overdueBorrowings, error } = await supabase
        .from('borrowings')
        .select('id, borrow_code, user_id, planned_return_date')
        .eq('status', 'Dipinjam')
        .lt('planned_return_date', today);

      if (error) {
        console.error('[CRON] Gagal mengambil data peminjaman:', error.message);
        return;
      }

      if (!overdueBorrowings || overdueBorrowings.length === 0) {
        console.log('[CRON] Tidak ada peminjaman terlambat.');
        return;
      }

      console.log(`[CRON] Ditemukan ${overdueBorrowings.length} peminjaman terlambat.`);

      const overdueIds = overdueBorrowings.map(b => b.id);

      // Update semua sekaligus ke status 'Terlambat'
      const { error: updateError } = await supabase
        .from('borrowings')
        .update({ status: 'Terlambat' })
        .in('id', overdueIds);

      if (updateError) {
        console.error('[CRON] Gagal update status terlambat:', updateError.message);
        return;
      }

      // Kirim notifikasi ke masing-masing user
      const now = new Date().toISOString();
      const notifications = overdueBorrowings.map(b => ({
        user_id: b.user_id,
        title: 'Peminjaman Terlambat',
        message: `Peminjaman dengan kode ${b.borrow_code} sudah melewati batas pengembalian (${b.planned_return_date}). Segera kembalikan barang ke petugas SARPRAS.`,
        type: 'peminjaman',
        is_read: false,
        created_at: now
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('[CRON] Gagal kirim notifikasi terlambat:', notifError.message);
      }

      console.log(`[CRON] Berhasil update ${overdueIds.length} peminjaman ke status Terlambat.`);
    } catch (err) {
      console.error('[CRON] Error tidak terduga:', err.message);
    }
  }, {
    timezone: 'Asia/Jakarta'
  });

  console.log('[CRON] Overdue checker aktif — berjalan setiap hari pukul 00:05 WIB');
};

module.exports = { startOverdueChecker };
