import multer from 'multer';

// Use memory storage so we can parse and validate CSV without leaving orphaned files
const storage = multer.memoryStorage();

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  // Check filename extension
  const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/csv',
    'text/x-csv',
    'application/octet-stream' // fallback for some browsers
  ];

  if (isCsvExt || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only CSV (.csv) files are supported.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

export const uploadCsv = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 1
  },
  fileFilter
});
