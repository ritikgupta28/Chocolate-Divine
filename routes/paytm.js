const express = require('express');

const paytmController = require('../controllers/paytm');
const isAuth = require('../middleware/is-auth');
const isAdminAuth = require('../middleware/is-adminAuth');

const router = express.Router();

router.use('/paynow', isAuth, paytmController.paynow);

router.use('/callback', isAuth, paytmController.callback);

module.exports = router;