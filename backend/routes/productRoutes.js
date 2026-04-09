const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    exportProducts,
    importProducts,
    exportCategories,
    importCategories
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for memory storage (we'll read the buffer with xlsx)
const upload = multer({ storage: multer.memoryStorage() });

// Categories
router.get('/categories/all', protect, getCategories);
router.post('/categories', protect, admin, createCategory);

router.route('/categories/export')
    .get(protect, exportCategories);

router.route('/categories/import')
    .post(protect, admin, upload.single('file'), importCategories);

router.route('/categories/:id')
    .put(protect, admin, updateCategory)
    .delete(protect, admin, deleteCategory);

// Products
router.route('/export')
    .get(protect, exportProducts);

router.route('/import')
    .post(protect, admin, upload.single('file'), importProducts);

router.route('/')
    .get(protect, getProducts)
    .post(protect, admin, createProduct);

router.route('/:id')
    .get(protect, getProduct)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);

module.exports = router;
