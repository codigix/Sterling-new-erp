const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  uploadDrawing, 
  createRevision, 
  reviewDrawing, 
  getDrawingHistory, 
  getRootCardDrawings,
  submitForReview,
  deleteDrawing
} = require('../controllers/designDrawingController');
const auth = require('../middleware/authMiddleware');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.xls', '.xlsx', '.doc', '.docx', '.csv', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload PDF, CAD, images, or Excel/Word documents.'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Drawing Routes
router.post('/upload', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, uploadDrawing);

router.post('/:parent_id/revision', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, createRevision);
router.put('/:id/review', auth, reviewDrawing);
router.put('/:id/submit', auth, submitForReview);
router.get('/:id/history', auth, getDrawingHistory);
router.get('/root-card/:rootCardId', auth, getRootCardDrawings);
router.delete('/:id', auth, deleteDrawing);

module.exports = router;
