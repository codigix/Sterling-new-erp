const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createRootCard,
  getAllRootCards,
  getRootCardById,
  updateRootCard,
  saveAllSteps,
  getStepData,
  deleteRootCard,
  sendToDesignEngineering,
  sendToProduction,
  sendToQuality,
  returnToDesignEngineering,
  uploadQAP,
  getAllRootCardRequirements,
  getRootCardRequirementsById,
  updateRootCardRequirements
} = require('../controllers/rootCardController');
const auth = require('../middleware/authMiddleware');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../', process.env.UPLOAD_PATH || 'uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// @route   POST api/root-cards
router.post('/', auth, createRootCard);

// @route   POST api/root-cards/:id/send-to-design-engineering
// @desc    Send root card to design engineering
router.post('/:id/send-to-design-engineering', auth, sendToDesignEngineering);

// @route   POST api/root-cards/:id/send-to-production
// @desc    Send root card to production
router.post('/:id/send-to-production', auth, sendToProduction);

// @route   POST api/root-cards/:id/send-to-quality
// @desc    Send root card to quality for QAP
router.post('/:id/send-to-quality', auth, sendToQuality);

// @route   POST api/root-cards/:id/return-to-design-engineering
// @desc    Return root card to design engineering from quality
router.post('/:id/return-to-design-engineering', auth, returnToDesignEngineering);

// @route   POST api/root-cards/:id/upload-qap
// @desc    Upload QAP for a root card
router.post('/:id/upload-qap', auth, upload.array('qap', 10), uploadQAP);

// @route   PUT api/root-cards/:id
// @desc    Update a root card
router.put('/:id', auth, updateRootCard);

// @route   GET api/root-cards
// @desc    Get all root cards
router.get('/', auth, getAllRootCards);

// @route   GET api/root-cards/requirements
router.get('/requirements', auth, getAllRootCardRequirements);

// @route   GET api/root-cards/requirements/:id
router.get('/requirements/:id', auth, getRootCardRequirementsById);

// @route   POST api/root-cards/requirements/:id
router.post('/requirements/:id', auth, updateRootCardRequirements);

// @route   GET api/root-cards/:id
// @desc    Get root card by ID
router.get('/:id', auth, getRootCardById);

// @route   POST api/root-cards/:id/steps/all
// @desc    Save all steps for a root card
router.post('/:id/steps/all', auth, saveAllSteps);

// @route   GET api/root-cards/:id/steps/:stepKey
// @desc    Get step data for a specific step
router.get('/:id/steps/:stepKey', auth, getStepData);

// @route   DELETE api/root-cards/:id
// @desc    Delete a root card
router.delete('/:id', auth, deleteRootCard);

module.exports = router;
