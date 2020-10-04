const path = require('path');

const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const isAdminAuth = require('../middleware/is-adminAuth');

const router = express.Router();

router.get('/add-product', isAuth, isAdminAuth, adminController.getAddProduct);

router.get('/products', isAuth, isAdminAuth, adminController.getProducts);

router.post(
  '/add-product',
  [
    body('title')
      .isString()
      .isLength({ min: 1 })
      .trim(),
    body('price').isFloat(),
    body('description')
      .isLength({ min: 1, max: 400 })
      .trim()
  ],
  isAuth,
  isAdminAuth,
  adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, isAdminAuth, adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title')
      .isString()
      .isLength({ min: 1 })
      .trim(),
    body('price').isFloat(),
    body('description')
      .isLength({ min: 1, max: 400 })
      .trim()
  ],
  isAuth,
  isAdminAuth,
  adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, isAdminAuth, adminController.deleteProduct);

module.exports = router;