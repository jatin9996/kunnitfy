const router = require("express").Router();
const nftController = require("./lib/controllers");
const nftMiddleware = require("./lib/middleware");

router.post("/create", nftMiddleware.verifyToken, nftController.create);
router.put(
  "/updateNftOrder",
  nftMiddleware.verifyToken,
  nftController.updateNftOrder
);
router.post("/mynftlist", nftMiddleware.verifyToken, nftController.mynftlist);
router.post(
  "/getCollectionDetailsById",
  nftMiddleware.verifyWithoutToken,
  nftController.getCollectionDetails
);
router.post(
  "/getCollectionDetailsByAddress",
  nftMiddleware.verifyWithoutToken,
  nftController.getCollectionDetailsByAddress
);

router.post(
  '/getMetaDataOfCollection',
  nftMiddleware.verifyWithoutToken,
  nftController.getMetaDataOfCollection
)

router.post(
  "/createCollection",
  nftMiddleware.verifyToken,
  nftController.createCollection
);

router.post(
  "/updateCOllectionVolume",
  nftMiddleware.verifyToken,
  nftController.updateCollectionVoulme
);
router.post(
  "/collectionList",
  // nftMiddleware.verifyToken,
  nftController.collectionlist
);
router.get(
  "/getcollections",
  nftMiddleware.proceedWithoutToken,
  nftController.getcollections
);
router.post(
  "/nftListing",
  nftMiddleware.verifyWithoutToken,
  nftController.nftListing
);
router.get(
  "/viewnft/:nNFTId",
  nftMiddleware.verifyWithoutToken,
  nftController.nftID
);
router.get(
  "/viewnftOwner/:nNFTId",
  nftMiddleware.verifyWithoutToken,
  nftController.getNftOwner
);
router.get(
  "/getAllnftOwner/:nNFTId",
  nftMiddleware.verifyWithoutToken,
  nftController.getAllnftOwner
);
router.post(
  "/setTransactionHash",
  nftMiddleware.verifyToken,
  nftController.setTransactionHash
);
router.get("/landing", nftMiddleware.verifyWithoutToken, nftController.landing);
router.get(
  "/deleteNFT/:nNFTId",
  nftMiddleware.verifyToken,
  nftController.deleteNFT
);
router.post(
  "/allCollectionWiseList",
  nftMiddleware.verifyWithoutToken,
  nftController.allCollectionWiselist
);



router.post(
  "/getHotCollections",
  nftMiddleware.verifyWithoutToken,
  nftController.getHotCollections
);

router.post(
  "/getAllCollections",
  nftMiddleware.verifyWithoutToken,
  nftController.getAllCollections
);
router.put(
  "/updateBasePrice",
  nftMiddleware.verifyToken,
  nftController.updateBasePrice
);
router.put(
  "/setNFTOrder",
  nftMiddleware.verifyToken,
  nftController.setNFTOrder
);

router.post(
  "/getOnSaleItems",
  nftMiddleware.verifyWithoutToken,
  nftController.getOnSaleItems
);

router.put(
  "/toggleSellingType",
  nftMiddleware.verifyToken,
  nftController.toggleSellingType
);
router.post(
  "/myCollectionList",
  nftMiddleware.verifyToken,
  nftController.collectionlistMy
);
router.post("/like", nftMiddleware.verifyToken, nftController.likeNFT);
router.post(
  "/uploadImage",
  nftMiddleware.verifyToken,
  nftController.uploadImage
);
router.get("/getAllNfts", nftController.getAllNfts);
router.post("/getOwnedNFTList", nftController.getOwnedNFTlist);
router.post("/getUserLikedNfts", nftController.getUserLikedNfts);
router.post("/getUserOnSaleNfts", nftController.getUserOnSaleNfts);
router.put(
  "/transferNfts",
  nftMiddleware.verifyToken,
  nftController.transferNfts
);
router.post("/getCollectionNFT", nftController.getCollectionNFT);
router.post(
  "/getCollectionNFTOwned",
  nftMiddleware.verifyToken,
  nftController.getCollectionNFTOwned
);
router.post("/getSearchedNft", nftController.getSearchedNft);

router.get(
  "/updateCollectionToken/:collectionAddress",
  nftMiddleware.verifyToken,
  nftController.updateCollectionToken
);
router.get('/getBanner', nftController.getBanner);
router.post('/updateOwner', nftController.updateOwners);
router.post('/updateOwnerWithOrder', nftController.updateOwnerWithOrder);
router.post("/updateStatus", nftMiddleware.verifyToken, nftController.updateStatus);
router.post("/getUnlockableContent", nftController.getUnlockableContent);
module.exports = router;
