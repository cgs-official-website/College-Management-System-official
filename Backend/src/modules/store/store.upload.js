import multer from 'multer';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, 
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only JPG, PNG or WebP images are allowed'), {
      statusCode: 400, code: 'INVALID_FILE_TYPE',
    }));
  },
});

export const imageUpload = (req, res, next) =>
  upload.single('image')(req, res, (err) => {
    if (err) {
      err.statusCode = 400;
      if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Image must be 2 MB or smaller';
      return next(err);
    }
    next();
  });