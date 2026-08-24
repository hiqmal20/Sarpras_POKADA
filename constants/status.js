const BORROWING_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  BORROWED: 'Dipinjam',
  RETURNED: 'Selesai',
  OVERDUE: 'Terlambat',
  CANCELLED: 'Dibatalkan'
};

const ITEM_CONDITION = {
  GOOD: 'Baik',
  SLIGHT_DAMAGE: 'Rusak Ringan',
  HEAVY_DAMAGE: 'Rusak Berat'
};

const ITEM_STATUS = {
  AVAILABLE: 'Tersedia',
  BORROWED: 'Dipinjam',
  MAINTENANCE: 'Dalam Pemeliharaan'
};

const DAMAGE_REPORT_STATUS = {
  PENDING: 'Menunggu Review',
  IN_PROGRESS: 'Sedang Diperbaiki',
  RESOLVED: 'Selesai',
  REJECTED: 'Ditolak'
};

const USER_STATUS = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  PENDING: 'Pending'
};

module.exports = {
  BORROWING_STATUS,
  ITEM_CONDITION,
  ITEM_STATUS,
  DAMAGE_REPORT_STATUS,
  USER_STATUS
};
