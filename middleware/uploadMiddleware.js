const multer = require('multer');

// Simpan file di memory (tidak perlu tulis ke disk)
const storage = multer.memoryStorage();

// File filter untuk CSV
const csvFileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file CSV yang diizinkan'), false);
  }
};

// File filter untuk gambar (foto profil)
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan (JPEG, PNG, GIF, WEBP)'), false);
  }
};

// Upload untuk CSV
const uploadCSV = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // max 2MB
});

// Upload untuk foto profil
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // max 5MB untuk gambar
});

module.exports = uploadCSV;
module.exports.uploadCSV = uploadCSV;
module.exports.uploadImage = uploadImage;
