const path = require('path');

const express = require('express');
const { body } = require('express-validator/check');

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

router.use('/ordermark/:orderId', isAuth, shopController.postOrderMark);

router.get('/orders', isAuth, shopController.getOrders);

router.post(
  '/create-order',
  [
    body('naam')
      .isString()
      .isLength({ min: 1 })
      .trim(),
    body('location')
      .isLength({ min: 1 })
      .trim(),
    body('nmbr')
      .isString()
      .isLength({ min: 10, max: 10 })
      .trim(),
    body('city')
      .isString()
      .isLength({ min: 1 })
      .trim(),
    body('pincode')
      .isString()
      .isLength({ min: 6, max: 6 })
      .trim()
  ],
  isAuth,
  shopController.postOrder
);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);

module.exports = router;