
  
const router = require('express').Router();
const orderController = require('./lib/controllers');
const orderMiddleware = require('./lib/middleware');

router.post('/createOrder', orderMiddleware.verifyToken, orderController.createOrder);
router.put('/updateOrder', orderMiddleware.verifyToken, orderController.updateOrder);
router.delete('/deleteOrder', orderMiddleware.verifyToken, orderController.deleteOrder);
router.delete('/deleteOfferOrder', orderMiddleware.verifyToken, orderController.deleteOfferOrder);

router.post('/getOrder', orderController.getOrder);
router.post('/getOrdersByNftId', orderController.getOrdersByNftId);

module.exports = router;