const { User, Bid, NFT, Order } = require("../../../models");
const validators = require("./validators");
const mongoose = require("mongoose");
const controllers = {};
const nodemailer = require("../../../utils/lib/nodemailer");
const Web3 = require("web3");
const ERC1155ABI = require("../../../../abis/extendedERC1155.json");
const ERC721ABI = require("../../../../abis/extendedERC721.json");
var web3 = new Web3(process.env.NETWORK_RPC_URL);


controllers.createBidNft = async (req, res) => {
  //console.log("req of create Bid nft is----->", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    console.log("Checking Old Bids");
    let CheckBid = await Bid.findOne({
      oBidder: mongoose.Types.ObjectId(req.userId),
      oOwner: mongoose.Types.ObjectId(req.body.oOwner),
      oNFTId: mongoose.Types.ObjectId(req.body.oNFTId),
      oOrderId: mongoose.Types.ObjectId(req.body.oOrderId),
      oBidStatus: "Bid",
    });
    if (CheckBid) {
      await Bid.findOneAndDelete(
        {
          oBidder: mongoose.Types.ObjectId(req.userId),
          oOwner: mongoose.Types.ObjectId(req.body.oOwner),
          oNFTId: mongoose.Types.ObjectId(req.body.oNFTId),
          oOrderId: mongoose.Types.ObjectId(req.body.oOrderId),
          oBidStatus: "Bid",
        },
        function (err, bidDel) {
          if (err) {
            console.log("Error in deleting Old Bid" + err);
          } else {
            console.log("Old Bid record Deleted" + bidDel);
          }
        }
      );
    }
    const bidData = new Bid({
      oBidder: req.userId,
      oOwner: req.body.oOwner,
      oBidStatus: "Bid",
      oBidPrice: req.body.oBidPrice,
      oNFTId: req.body.oNFTId,
      oOrderId: req.body.oOrderId,
      oBidQuantity: req.body.oBidQuantity,
      oBuyerSignature: req.body.oBuyerSignature,
      oBidDeadline: req.body.oBidDeadline,
      salt: req.body.salt,
      tokenId: req.body.tokenId,
      tokenAddress: req.body.tokenAddress
    });
    await Order.findOne({ _id: mongoose.Types.ObjectId(req.body.oOrderId) }, async function (errOrder, orderDataFound) {
      if (errOrder) {
        console.log("Fetching order Query Error", errOrder);
        return res.reply(messages.error());
      }
      if (!orderDataFound) {
        console.log("Order Not found in Database");
        return res.reply(messages.error());
      } else {
        bidData.save().then(async (result) => {
          return res.reply(messages.created("Bid Placed"), result);
        }).catch((error) => {
          console.log("Created Bid error", error);
          return res.reply(messages.error());
        });
      }
    });
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
};

controllers.updateBidNft = async (req, res) => {
  //console.log("req", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    console.log("Checking Old Bids");
    let bidID = req.body.bidID;
    let CheckBid = await Bid.findById(bidID);
    if (CheckBid) {
      if (req.body.action == "Delete" || req.body.action == "Cancelled") {
        await Bid.findOneAndDelete(
          { _id: mongoose.Types.ObjectId(bidID) },
          function (err, delBid) {
            if (err) {
              console.log("Error in Deleting Bid" + err);
              return res.reply(messages.error());
            } else {
              console.log("Bid Deleted : ", delBid);
              return res.reply(messages.created("Bid Cancelled"), delBid);
            }
          }
        );
      } else {
        await Bid.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(bidID) },
          { oBidStatus: req.body.action },
          function (err, rejBid) {
            if (err) {
              console.log("Error in Rejecting Bid" + err);
              return res.reply(messages.error());
            } else {
              console.log("Bid Rejected : ", rejBid);
              return res.reply(messages.created("Bid Rejected"), rejBid);
            }
          }
        );
      }
    } else {
      console.log("Bid Not found");
      return res.reply("Bid Not found");
    }
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
};

controllers.fetchBidNft = async (req, res) => {
  //console.log("req", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    let nftID = req.body.nftID;
    let orderID = req.body.orderID;
    let buyerID = req.body.buyerID;
    let bidStatus = req.body.bidStatus;
    let oTypeQuery = {};
    let onftIDQuery = {};
    let oorderIDQuery = {};
    let obuyerIDQuery = {};

    let filters = [];
    if (bidStatus != "All") {
      oTypeQuery = { oBidStatus: bidStatus };
    }
    if (nftID != "All") {
      onftIDQuery = { oNFTId: mongoose.Types.ObjectId(nftID) };
    }
    if (orderID != "All") {
      oorderIDQuery = { oOrderId: mongoose.Types.ObjectId(orderID) };
    }
    if (buyerID != "All") {
      obuyerIDQuery = { oBidder: mongoose.Types.ObjectId(buyerID) };
    }
    //console.log("fileter are---->", filters);
    let data = await Bid.aggregate([
      {
        $match: {
          $and: [
            { oBidQuantity: { $gte: 1 } },
            //{ oBidStatus: "Bid" },
            oTypeQuery,
            onftIDQuery,
            oorderIDQuery,
            obuyerIDQuery,
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oBidder",
          foreignField: "_id",
          as: "oBidder",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oOwner",
          foreignField: "_id",
          as: "oOwner",
        },
      },
      {
        $project: {
          _id: 1,
          "oBidder._id": 1,
          "oBidder.sUserName": 1,
          "oBidder.oName": 1,
          "oBidder.sProfilePicUrl": 1,
          "oBidder.sWalletAddress":1,
          "oOwner._id": 1,
          "oOwner.sUserName": 1,
          "oOwner.oName": 1,
          "oOwner.sProfilePicUrl": 1,
          "oOwner.sWalletAddress":1,
          oBidStatus: 1,
          oBidPrice: 1,
          oNFTId: 1,
          oOrderId: 1,
          oBidQuantity: 1,
          oBuyerSignature: 1,
          oBidDeadline: 1,
          isOffer: 1,
          salt: 1,
          tokenId: 1,
          tokenAddress: 1,
          paymentToken: 1
        },
      },
      
      {
        $sort: {
          sCreated: -1,
        },
      },
      { $unwind: "$oBidder" },
      { $unwind: "$oOwner" },
      {
        $facet: {
          bids: [
            {
              $skip: +0,
            },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);
    console.log("Datat is------------->" , data[0].bids);
    let iFiltered = data[0].bids.length;
    if (data[0].totalCount[0] == undefined) {
      return res.reply(messages.no_prefix("Bid Details"), {
        data: [],
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: 0,
      });
    } else {
      return res.reply(messages.no_prefix("Bid Details"), {
        data: data[0].bids,
        draw: req.body.draw,
        recordsTotal: data[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }
  } catch (error) {
    console.log("error on fetch bid nft---0----->", error)
    return res.reply(messages.server_error());
  }
};

controllers.acceptBidNft = async (req, res) => {
  //console.log("req accept bid nft 225", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body.bidID)
      return res.reply(messages.bad_request(), "Bid is required.");
    let lazyMintingStatus = Number(req.body.LazyMintingStatus);
    if (lazyMintingStatus === 0) {
      lazyMintingStatus = 0;
    } else if (lazyMintingStatus === 1 || lazyMintingStatus === 2) {
      lazyMintingStatus = 2;
    }
    console.log("Checking Old Bids");
    let erc721 = req.body.erc721;
    let bidID = req.body.bidID;
    let status = req.body.status;
    let qty_sold = req.body.qty_sold;
    let BidData = await Bid.findById(bidID);
    console.log("bid data is----->", BidData)
    if (BidData) {
      let oNFTId = BidData.oNFTId;
      let orderId = BidData.oOrderId;
      let boughtQty = parseInt(BidData.oBidQuantity);
      let oBidder = BidData.oBidder;
      let BuyerData = await User.findById(oBidder);
      let oBuyer = BuyerData.sWalletAddress;
      let oOwner = BidData.oOwner;
      let OwnerData = await User.findById(oOwner);
      let oSeller = OwnerData.sWalletAddress;

      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            quantity_sold: qty_sold,
          },
        },
        {
          upsert: true,
        },
        (err) => {
          if (err) throw error;
        }
      );
      //deduct previous owner
      await NFT.findOne({ _id: mongoose.Types.ObjectId(req.body.oNftId) }, async function (errNFT, nftDataFound) {
        if (errNFT) {
          console.log("Error in finding NFT", errNFT)
          throw errNFT;
        }
        if (nftDataFound !== undefined) {
          let ContractAddress = nftDataFound?.nCollection;
          let tokenID = nftDataFound?.nTokenID;
          let ERCType = nftDataFound?.nType;
          if (ContractAddress !== undefined) {
            let sellerAddress = req.body.oSeller.toLowerCase();
            let buyerAddress = req.body.oBuyer.toLowerCase();
            if (ERCType === 1) {
              let con = new web3.eth.Contract(ERC721ABI.abi, ContractAddress)
              let currentOwnerAddress = await con.methods.ownerOf(tokenID).call();
              let OwnedBy = [];
              OwnedBy.push({
                address: currentOwnerAddress.toLowerCase(),
                quantity: 1,
              });
              let updateNFTData = { nOwnedBy: OwnedBy }
              await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.oNftId) },
                { $set: updateNFTData }, { new: true }, async function (errUpdate, updateNFT) {
                  if (errUpdate) {
                    console.log("Error in Updating Qty ERC 721", errUpdate);
                  }
                });
            } else {
              let con = new web3.eth.Contract(ERC1155ABI.abi, ContractAddress)
              let sellerCurrentQty = await con.methods.balanceOf(sellerAddress, tokenID).call();
              let buyerCurrentQty = await con.methods.balanceOf(buyerAddress, tokenID).call();
              console.log("seller qty", sellerCurrentQty, buyerCurrentQty)
              let isExist = await NFT.exists(
                {
                  _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": sellerAddress
                })

              if (parseInt(sellerCurrentQty) === 0 || sellerCurrentQty === undefined) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $pull: { nOwnedBy: { address: sellerAddress } } }
                ).catch((e) => {
                  console.log("Error in Deleting Seller Qty ", e.message);
                });
              } else if (parseInt(sellerCurrentQty) > 0 && isExist) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": sellerAddress },
                  { $set: { "nOwnedBy.$.quantity": parseInt(sellerCurrentQty) } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
              else if (parseInt(sellerCurrentQty) > 0) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $push: { nOwnedBy: { address: sellerAddress, quantity: parseInt(sellerCurrentQty) } } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }

              isExist = await NFT.exists(
                {
                  _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": buyerAddress
                })


              if (parseInt(buyerCurrentQty) === 0 || buyerCurrentQty === undefined) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $pull: { nOwnedBy: { address: buyerAddress } } }
                ).catch((e) => {
                  console.log("Error in Deleting Seller Qty ", e.message);
                });
              } else if (parseInt(buyerCurrentQty) > 0 && isExist) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": buyerAddress },
                  { $set: { "nOwnedBy.$.quantity": parseInt(buyerCurrentQty) } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
              else if (parseInt(buyerCurrentQty) > 0) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $push: { nOwnedBy: { address: buyerAddress, quantity: parseInt(buyerCurrentQty) } } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
            }

          } else {
            console.log("Error in finding Collection", nftDataFound)
            return res.reply(messages.not_found(), "Collection Not found.");
          }
        } else {
          console.log("Error in finding NFT Data", nftDataFound)
          return res.reply(messages.not_found(), "NFT.");
        }
      });


      await Bid.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(bidID),
        },
        { oBidStatus: "Accepted" },
        function (err, acceptBid) {
          if (err) {
            console.log("Error in Accepting Bid" + err);
            return res.reply(messages.error());
          } else {
            console.log("Bid Accepted : ", acceptBid);
          }
        }
      );
      if (erc721) {
        await Bid.deleteMany({
          oOwner: mongoose.Types.ObjectId(oOwner),
          oNFTId: mongoose.Types.ObjectId(oNFTId),
          oBidStatus: "Bid",
        })
          .then(function () {
            console.log("Data deleted");
          })
          .catch(function (error) {
            console.log(error);
          });
        await Bid.deleteMany({
          oOwner: mongoose.Types.ObjectId(oOwner),
          oNFTId: mongoose.Types.ObjectId(oNFTId),
          oBidStatus: "MakeOffer",
        })
          .then(function () {
            console.log("Data deleted");
          })
          .catch(function (error) {
            console.log(error);
          });
      } else {
        let _order = await Order.findOne({
          _id: mongoose.Types.ObjectId(orderId),
        });
        let leftQty = parseInt(_order.oQuantity - qty_sold);
        if (leftQty <= 0) {
          await Order.deleteOne({ _id: mongoose.Types.ObjectId(orderId) });
        }
        console.log("left qty 1155 in accept offer is---->", leftQty);

        await Bid.deleteMany({
          oOwner: mongoose.Types.ObjectId(oOwner),
          oNFTId: mongoose.Types.ObjectId(oNFTId),
          oBidStatus: "Bid",
          oBidQuantity: { $gt: leftQty },
        })
          .then(function () {
            console.log("Data deleted from 1155");
          })
          .catch(function (error) {
            console.log(error);
          });
        await Bid.deleteMany({
          oOwner: mongoose.Types.ObjectId(oOwner),
          oNFTId: mongoose.Types.ObjectId(oNFTId),
          oBidStatus: "MakeOffer",
          oBidQuantity: { $gt: leftQty },
        })
          .then(function () {
            console.log("Data deleted from 1155");
          })
          .catch(function (error) {
            console.log(error);
          });
      }





      console.log("here it reaches", lazyMintingStatus)
      await NFT.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(oNFTId) },
        {
          $set: {
            nLazyMintingStatus: Number(lazyMintingStatus),
          },
        }
      ).catch((e) => {
        console.log("Error1", e.message);
      });
      return res.reply(messages.updated("order"));
    } else {
      console.log("Bid Not found");
      return res.reply("Bid Not found");
    }
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
};

// Create Offer NFT
controllers.createOfferNft = async (req, res) => {
  //console.log("req of create offer nft-->419", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    console.log("Checking Old Offer");
    let CheckBid = await Bid.findOne({
      oBidder: mongoose.Types.ObjectId(req.userId),
      oOwner: mongoose.Types.ObjectId(req.body.oOwner),
      oNFTId: mongoose.Types.ObjectId(req.body.oNFTId),
      oOrderId: mongoose.Types.ObjectId(req.body.oOrderId),
      oBidStatus: "MakeOffer",
    });
    if (CheckBid) {
      await Bid.findOneAndDelete(
        {
          oBidder: mongoose.Types.ObjectId(req.userId),
          oOwner: mongoose.Types.ObjectId(req.body.oOwner),
          oNFTId: mongoose.Types.ObjectId(req.body.oNFTId),
          oOrderId: mongoose.Types.ObjectId(req.body.oOrderId),
          oBidStatus: "MakeOffer",
        },
        function (err, bidDel) {
          if (err) {
            console.log("Error in deleting Old Offer" + err);
          } else {
            console.log("Old Offer record Deleted" + bidDel);
          }
        }
      );
    }
    const bidData = new Bid({
      oBidder: req.userId,
      oOwner: req.body.oOwner,
      oBidStatus: "MakeOffer",
      oBidPrice: req.body.oBidPrice,
      oNFTId: req.body.oNFTId,
      oOrderId: req.body.oOrderId,
      oBidQuantity: req.body.oBidQuantity,
      oBuyerSignature: req.body.oBuyerSignature,
      oBidDeadline: req.body.oBidDeadline,
      isOffer: true,
      salt: req.body.salt,
      tokenId: req.body.tokenId,
      tokenAddress: req.body.tokenAddress,
      paymentToken: req.body.paymentToken
    });

    await Order.findOne({ _id: mongoose.Types.ObjectId(req.body.oOrderId) }, async function (errOrder, orderDataFound) {
      if (errOrder) {
        console.log("Fetching order Query Error", errOrder);
        return res.reply(messages.error());
      }
      if (!orderDataFound) {
        console.log("Order Not found in Database");
        return res.reply(messages.error());
      } else {
        bidData.save().then(async (result) => {
          return res.reply(messages.created("Offer Placed"), result);
        }).catch((error) => {
          console.log("Created Offer error", error);
          return res.reply(messages.error());
        });
      }
    });

  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
};
//Create offer Ends


//Fetch offer NFT
controllers.fetchOfferNft = async (req, res) => {
  //console.log("req in fetchOffer nft----->478", req.body);
  try {
    let nftID = req.body.nftID;
    let orderID = req.body.orderID
    let buyerID = req.body.buyerID;
    let bidStatus = req.body.bidStatus;
    let oTypeQuery = {};
    let onftIDQuery = {};
    let oorderIDQuery = {}

    let obuyerIDQuery = {};

    let filters = [];
    if (bidStatus != "All") {

      oTypeQuery = { oBidStatus: bidStatus };
    }
    if (nftID != "All") {
      onftIDQuery = { oNFTId: mongoose.Types.ObjectId(nftID) };
    }
    if (orderID != "All") {
      oorderIDQuery = { oOrderId: mongoose.Types.ObjectId(orderID) };
    }
    if (buyerID != "All") {
      obuyerIDQuery = { oBidder: mongoose.Types.ObjectId(buyerID) };
    }
    console.log(oTypeQuery,obuyerIDQuery,onftIDQuery,oorderIDQuery);
    let data = await Bid.aggregate([
      {
        $match: {
          $and: [
            { oBidQuantity: { $gte: 1 } },
            { oBidStatus: "MakeOffer" },
            oTypeQuery,
            onftIDQuery,
            obuyerIDQuery,
            oorderIDQuery
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oBidder",
          foreignField: "_id",
          as: "oBidder",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oOwner",
          foreignField: "_id",
          as: "oOwner",
        },
      },
      {
        $project: {
          _id: 1,
          "oBidder._id": 1,
          "oBidder.sUserName": 1,
          "oBidder.oName": 1,
          "oBidder.sProfilePicUrl": 1,
          "oOwner._id": 1,
          "oOwner.sUserName": 1,
          "oOwner.oName": 1,
          "oOwner.sProfilePicUrl": 1,
          oBidStatus: 1,
          oBidPrice: 1,
          oNFTId: 1,
          oOrderId: 1,
          oBidQuantity: 1,
          oBuyerSignature: 1,
          oBidDeadline: 1,
          salt: 1,
          tokenId: 1,
          tokenAddress: 1,
          paymentToken: 1
        },
      },
      
      {
        $sort: {
          sCreated: -1,
        },
      },
      { $unwind: "$oBidder" },
      { $unwind: "$oOwner" },
      {
        $facet: {
          bids: [
            {
              $skip: +0,
            },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    console.log("Data of offer is--->574" , data);
    let iFiltered = data[0].bids.length;
    if (data[0].totalCount[0] == undefined) {
      return res.reply(messages.no_prefix("Offer Details"), {
        data: [],
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: 0,
      });
    } else {
      return res.reply(messages.no_prefix("Offer Details"), {
        data: data[0].bids,
        draw: req.body.draw,
        recordsTotal: data[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }
  } catch (error) {
    console.log("error is", error);
    return res.reply(messages.server_error());
  }
}
//Fetch offer ends

//Accept Offer NFT
controllers.acceptOfferNft = async (req, res) => {
  //console.log("req in accept offer", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body.bidID)
      return res.reply(messages.bad_request(), "Offer is required.");

    //console.log("Checking Old Offer");
    let erc721 = req.body.erc721;
    let bidID = req.body.bidID;
    let status = req.body.status;
    let qty_sold = req.body.qty_sold;
    let BidData = await Bid.findById(bidID);

    if (BidData.oBidStatus === "MakeOffer") {
      let oNFTId = BidData.oNFTId;
      let orderId = BidData.oOrderId;
      let boughtQty = parseInt(BidData.oBidQuantity);
      let oBidder = BidData.oBidder;
      let BuyerData = await User.findById(oBidder);
      let oBuyer = BuyerData.sWalletAddress;
      let oOwner = BidData.oOwner;
      let OwnerData = await User.findById(oOwner);
      let oSeller = OwnerData.sWalletAddress;
      let lazyMintingStatus = Number(req.body.LazyMintingStatus);
      if (lazyMintingStatus === 0) {
        lazyMintingStatus = 0;
      } else if (lazyMintingStatus === 1 || lazyMintingStatus === 2) {
        lazyMintingStatus = 2;
      }
      console.log("lazy minting status", lazyMintingStatus)
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            quantity_sold: qty_sold,
          },
        },
        {
          upsert: true,
        },
        (err) => {
          if (err) throw error;
        }
      );
      console.log('bid----=',BidData?.oNFTId)
      await NFT.findOne({ _id: mongoose.Types.ObjectId(BidData?.oNFTId) }, async function (errNFT, nftDataFound) {
        if (errNFT) {
          console.log("Error in finding NFT", errNFT)
          throw errNFT;
        }
        console.log('collection----==',nftDataFound)
        if (nftDataFound !== undefined) {
          let ContractAddress = nftDataFound?.nCollection;
          let tokenID = nftDataFound?.nTokenID;
          let ERCType = nftDataFound?.nType;
          if (ContractAddress !== undefined) {
            let sellerAddress = OwnerData.sWalletAddress;
            let buyerAddress = BuyerData.sWalletAddress;
            if (ERCType === 1) {
              let con = new web3.eth.Contract(ERC721ABI.abi, ContractAddress)
              let currentOwnerAddress = await con.methods.ownerOf(tokenID).call();
              let OwnedBy = [];
              OwnedBy.push({
                address: currentOwnerAddress.toLowerCase(),
                quantity: 1,
              });
              let updateNFTData = { nOwnedBy: OwnedBy }
              await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.oNftId) },
                { $set: updateNFTData }, { new: true }, async function (errUpdate, updateNFT) {
                  if (errUpdate) {
                    console.log("Error in Updating Qty ERC 721", errUpdate);
                  }
                });
            } else {
              let con = new web3.eth.Contract(ERC1155ABI.abi, ContractAddress)
              let sellerCurrentQty = await con.methods.balanceOf(sellerAddress, tokenID).call();
              let buyerCurrentQty = await con.methods.balanceOf(buyerAddress, tokenID).call();
              console.log("seller qty", sellerCurrentQty, buyerCurrentQty)
              let isExist = await NFT.exists(
                {
                  _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": sellerAddress
                })

              if (parseInt(sellerCurrentQty) === 0 || sellerCurrentQty === undefined) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $pull: { nOwnedBy: { address: sellerAddress } } }
                ).catch((e) => {
                  console.log("Error in Deleting Seller Qty ", e.message);
                });
              } else if (parseInt(sellerCurrentQty) > 0 && isExist) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": sellerAddress },
                  { $set: { "nOwnedBy.$.quantity": parseInt(sellerCurrentQty) } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
              else if (parseInt(sellerCurrentQty) > 0) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $push: { nOwnedBy: { address: sellerAddress, quantity: parseInt(sellerCurrentQty) } } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }

              isExist = await NFT.exists(
                {
                  _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": buyerAddress
                })


              if (parseInt(buyerCurrentQty) === 0 || buyerCurrentQty === undefined) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $pull: { nOwnedBy: { address: buyerAddress } } }
                ).catch((e) => {
                  console.log("Error in Deleting Seller Qty ", e.message);
                });
              } else if (parseInt(buyerCurrentQty) > 0 && isExist) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId), "nOwnedBy.address": buyerAddress },
                  { $set: { "nOwnedBy.$.quantity": parseInt(buyerCurrentQty) } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
              else if (parseInt(buyerCurrentQty) > 0) {
                await NFT.findOneAndUpdate(
                  { _id: mongoose.Types.ObjectId(req.body.oNftId) },
                  { $push: { nOwnedBy: { address: buyerAddress, quantity: parseInt(buyerCurrentQty) } } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
            }

          } else {
            console.log("Error in finding Collection", nftDataFound)
            return res.reply(messages.not_found(), "Collection Not found.");
          }
        } else {
          console.log("Error in finding NFT Data", nftDataFound)
          return res.reply(messages.not_found(), "NFT.");
        }
      });

      await NFT.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(oNFTId) },
        {
          $set: {
            nLazyMintingStatus: Number(lazyMintingStatus),
          },
        }
      ).catch((e) => {
        console.log("Error1", e.message);
      });

      await Bid.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(bidID),
        },
        { oBidStatus: "Accepted" },
        function (err, acceptBid) {
          if (err) {
            console.log("Error in Accepting Bid" + err);
            return res.reply(messages.error());
          } else {
            console.log("Offer Accepted : ", acceptBid);
          }
        }
      );
      if (erc721) {
        await Bid.deleteMany({
          oOwner: mongoose.Types.ObjectId(oOwner),
          oNFTId: mongoose.Types.ObjectId(oNFTId),
          oBidStatus: "MakeOffer",
        })
          .then(function () {
            console.log("Data deleted");
          })
          .catch(function (error) {
            console.log(error);
          });
        await Bid.deleteMany({
          oOwner: mongoose.Types.ObjectId(oOwner),
          oNFTId: mongoose.Types.ObjectId(oNFTId),
          oBidStatus: "Bid",
        })
          .then(function () {
            console.log("Data deleted");
          })
          .catch(function (error) {
            console.log(error);
          });
      } else {
        let _order = await Order.findOne({
          _id: mongoose.Types.ObjectId(orderId),
        });
        let leftQty = _order.oQuantity - qty_sold;
        if (leftQty <= 0) {
          await Order.deleteOne({ _id: mongoose.Types.ObjectId(orderId) });
        }
        //console.log("left qty 1155", leftQty);
        if (leftQty === 1 || leftQty == 0) {
          await Bid.deleteMany({
            oOwner: mongoose.Types.ObjectId(oOwner),
            oNFTId: mongoose.Types.ObjectId(oNFTId),
            oBidStatus: "MakeOffer",
          })
            .then(function () {
              console.log("Data deleted");
            })
            .catch(function (error) {
              console.log(error);
            });
          await Bid.deleteMany({
            oOwner: mongoose.Types.ObjectId(oOwner),
            oNFTId: mongoose.Types.ObjectId(oNFTId),
            oBidStatus: "Bid",
          })
            .then(function () {
              console.log("Data deleted");
            })
            .catch(function (error) {
              console.log(error);
            });
        } else {
          await Bid.deleteMany({
            oOwner: mongoose.Types.ObjectId(oOwner),
            oNFTId: mongoose.Types.ObjectId(oNFTId),
            oBidStatus: "MakeOffer",
            oBidQuantity: { $gt: leftQty },
          })
            .then(function () {
              //console.log("Data deleted from 1155");
            })
            .catch(function (error) {
              console.log(error);
            });
          await Bid.deleteMany({
            oOwner: mongoose.Types.ObjectId(oOwner),
            oNFTId: mongoose.Types.ObjectId(oNFTId),
            oBidStatus: "Bid",
            oBidQuantity: { $gt: leftQty },
          })
            .then(function () {
              console.log("Data deleted from 1155");
            })
            .catch(function (error) {
              console.log(error);
            });
        }

      }

      return res.reply(messages.updated("order"));
    } else {
      console.log("Bid Not found");
      return res.reply("Bid Not found");
    }
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
};

// controllers.acceptOfferNft = async (req, res) => {
//   try {
//     if (!req.userId) {
//       return res.reply(messages.unauthorized());
//     }
    
//     if (!req.body.bidID) {
//       return res.reply(messages.bad_request(), "Offer is required.");
//     }

//     const bidID = req.body.bidID;
//     const BidData = await Bid.findById(bidID);

//     if (BidData.oBidStatus !== "MakeOffer") {
//       console.log("Bid Not found");
//       return res.reply("Bid Not found");
//     }

//     const { oNFTId, oOrderId, oBidQuantity, oBidder, oOwner } = BidData;

//     const BuyerData = await User.findById(oBidder);
//     const oBuyer = BuyerData.sWalletAddress;
//     const OwnerData = await User.findById(oOwner);
//     const oSeller = OwnerData.sWalletAddress;

//     let lazyMintingStatus = Number(req.body.LazyMintingStatus) || 0;

//     await Order.updateOne(
//       { _id: oOrderId },
//       { $set: { quantity_sold: req.body.qty_sold } },
//       { upsert: true }
//     );

//     const nftDataFound = await NFT.findById(req.body.oNftId);

//     if (!nftDataFound) {
//       console.log("NFT not found");
//       return res.reply(messages.not_found(), "NFT.");
//     }

//     const { nCollection, nTokenID, nType } = nftDataFound;

//     if (!nCollection) {
//       console.log("Collection not found");
//       return res.reply(messages.not_found(), "Collection Not found.");
//     }

//     let con;
//     if (nType === 1) {
//       con = new web3.eth.Contract(ERC721ABI.abi, nCollection);
//     } else {
//       con = new web3.eth.Contract(ERC1155ABI.abi, nCollection);
//     }

//     const sellerAddress = oSeller.toLowerCase();
//     const buyerAddress = oBuyer.toLowerCase();

//     if (nType === 1) {
//       const currentOwnerAddress = await con.methods.ownerOf(nTokenID).call();
//       const OwnedBy = [{ address: currentOwnerAddress.toLowerCase(), quantity: 1 }];
//       await NFT.findByIdAndUpdate(req.body.oNftId, { $set: { nOwnedBy: OwnedBy } });
//     } else {
//       const sellerCurrentQty = await con.methods.balanceOf(sellerAddress, nTokenID).call();
//       const buyerCurrentQty = await con.methods.balanceOf(buyerAddress, nTokenID).call();
//       console.log("seller qty", sellerCurrentQty, buyerCurrentQty);

//       // Update seller and buyer quantities

//     }

//     await NFT.findByIdAndUpdate(oNFTId, { $set: { nLazyMintingStatus: lazyMintingStatus } });

//     await Bid.findByIdAndUpdate(bidID, { oBidStatus: "Accepted" });

//     // Delete relevant bids and orders

//     return res.reply(messages.updated("order"));
//   } catch (error) {
//     console.log("Error:", error);
//     return res.reply(messages.error());
//   }
// };

controllers.checkBidOffer = async (req, res) => {
  //console.log("req of checkBid Offer",req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body.bidID)
      return res.reply(messages.bad_request(), "Record ID is required.");
    console.log("Checking Offer");
    let recordID = req.body.bidID;
    Bid.find({ _id: mongoose.Types.ObjectId(recordID) }, async function (err, recData) {
      if (err) {
        return res.reply(messages.server_error("Data"));
      } else {
        if (recData.length == 0) {
          return res.reply(messages.not_found("Data"));
        } else {
          return res.reply(messages.successfully("Data Found"), recData);
        }
      }
    });
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
}

controllers.deleteBidsByBidId = async (req, res) => {
  console.log("req", req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body.bidID)
      return res.reply(messages.bad_request(), "Order ID is required.");

    let bidID = req.body.bidID;
    await Bid.deleteMany({ _id: mongoose.Types.ObjectId(bidID) })
      .then(function () {
        console.log("Bids Data deleted Code");
        return res.reply(messages.updated("order"));
      })
      .catch(function (error) {
        console.log("Bids Data deleted Error", error);
        return res.reply(messages.error());
      });
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
}
module.exports = controllers;
