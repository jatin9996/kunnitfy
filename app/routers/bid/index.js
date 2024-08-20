const router = require('express').Router();
const bidController = require('./lib/controllers');
const bidMiddleware = require('./lib/middleware');

router.post("/createBidNft",bidMiddleware.verifyToken,bidController.createBidNft);
router.post("/updateBidNft",bidMiddleware.verifyToken,bidController.updateBidNft);
router.post("/fetchBidNft",bidMiddleware.verifyToken,bidController.fetchBidNft);
router.post("/acceptBidNft",bidMiddleware.verifyToken,bidController.acceptBidNft);

//make offer
router.post("/createOfferNft",bidMiddleware.verifyToken,bidController.createOfferNft);
router.post("/fetchOfferNft",bidMiddleware.verifyToken,bidController.fetchOfferNft);
router.post("/acceptOfferNft",bidMiddleware.verifyToken,bidController.acceptOfferNft);


router.post("/checkBidOffer",bidMiddleware.verifyToken,bidController.checkBidOffer);
router.post("/deleteBidsByBidId",bidMiddleware.verifyToken,bidController.deleteBidsByBidId);





module.exports = router;
