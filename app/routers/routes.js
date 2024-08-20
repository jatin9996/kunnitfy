const router = require('express').Router();

const authRoute = require('./auth');
const userRoute = require('./user');
const adminRoute = require('./admin');
const nftRoute = require('./nft');
const bidRoute = require('./bid');
const orderRoute = require('./order');
const historyRoute = require('./history');


router.use('/auth', authRoute);
router.use('/user', userRoute);
router.use('/admin', adminRoute);
router.use('/nft', nftRoute);
router.use('/bid', bidRoute);
router.use('/order', orderRoute);
router.use('/history', historyRoute);

module.exports = router;
