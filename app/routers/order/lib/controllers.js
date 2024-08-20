const fs = require("fs");
const ipfsAPI = require("ipfs-api");
const ipfs = ipfsAPI("ipfs.infura.io", "5001", {
  protocol: "https",
  auth: "21w11zfV67PHKlkAEYAZWoj2tsg:f2b73c626c9f1df9f698828420fa8439",
});
const { Order, NFT, Bid, User, Collection } = require("../../../models");



const mongoose = require("mongoose");
const validators = require("./validators");
var jwt = require("jsonwebtoken");
const Web3 = require("web3");

const ERC721ABI = require("./../../../../contract/ERC721ABI.json");
const ERC1155ABI = require("./../../../../contract/ERC1155ABI.json");
const controllers = {};

controllers.createOrder = async (req, res) => {
  try {
    // if (!req.userId) return res.reply(messages.unauthorized());

    let orderDate = new Date().setFullYear(new Date().getFullYear() + 10);
    let validity = Math.floor(orderDate / 1000);
    const order = new Order({
      oNftId: req.body.nftId,
      oSellerWalletAddress: req.body.seller,
      oTokenId: req.body.tokenId,
      oTokenAddress: req.body.collection,
      oQuantity: req.body.quantity,
      oType: req.body.saleType,
      oPaymentToken: req.body.tokenAddress,
      oPrice: req.body.price,
      oSalt: req.body.salt,
      oSignature: req.body.signature,
      oValidUpto: req.body.validUpto,
      oBundleTokens: [],
      oBundleTokensQuantities: [],
      oSeller: req.userId,
      auction_end_date: req.body.auctionEndDate,
    });
    let nftPrice = parseFloat(req.body.price);
    console.log("nftPrice", nftPrice)
    const formattedNumber = nftPrice.toLocaleString('fullwide', { useGrouping: false });
    if (formattedNumber > 0) {
      const nftData = await NFT.findById(req.body.nftId);
      if (nftData === null || nftData === undefined) {
        return res.reply(messages.invalid('NFT ID'));
      } else {
        const userData = await User.findOne({ sWalletAddress: _.toChecksumAddress(req.body.seller) });
        if (userData === null || userData === undefined) {
          return res.reply(messages.invalid('Wallet Address'));
        } else {
          const loggedInUserData = await User.findById(req.userId);
          if (loggedInUserData === null || loggedInUserData === undefined) {
            return res.reply(messages.invalid('Seller'));
          } else {
            if (loggedInUserData.sWalletAddress.toLowerCase() === userData.sWalletAddress.toLowerCase()) {
              const collectionData = await Collection.findOne({ sContractAddress: req.body.collection });
              if (collectionData === null || collectionData === undefined) {
                return res.reply(messages.invalid('Collection Address'));
              } else {
                const web3 = new Web3(process.env.JSON_RPC_URL);
                const contractAddress = _.toChecksumAddress(req.body.collection);
                const sellerAddress = _.toChecksumAddress(req.body.seller);

                if (collectionData.erc721) {
                  console.log("reading 721")
                  try {
                    const contractData = new web3.eth.Contract(ERC721ABI, contractAddress);
                    console.log("reading 721", nftData.nTokenID, contractAddress)
                    const nftOwner = await contractData.methods.ownerOf(nftData.nTokenID).call();
                    console.log("nftOwner", nftOwner)
                    if (sellerAddress === nftOwner) {
                      order.save().then((result) => {
                        return res.reply(messages.created("Order"), result);
                      }).catch((error) => {
                        return res.reply(messages.already_exists("Failed:" + error));
                      });
                    } else {
                      return res.reply(messages.invalid('Seller Address'));
                    }
                  } catch (contractErr) {
                    console.log("reading 721 Error", contractErr)
                  }
                } else {
                  console.log("reading 1155")
                  try {
                    const contractData = new web3.eth.Contract(ERC1155ABI, contractAddress);
                    console.log("reading 721", nftData.nTokenID, contractAddress)
                    const balanceOf = await contractData.methods.balanceOf(sellerAddress, nftData.nTokenID).call();
                    console.log("balanceOf", balanceOf)
                    if (parseInt(balanceOf) >= parseInt(req.body.quantity)) {
                      order.save().then((result) => {
                        return res.reply(messages.created("Order"), result);
                      }).catch((error) => {
                        return res.reply(messages.already_exists("Failed:" + error));
                      });
                    } else {
                      return res.reply(messages.invalid('Seller Quantity'));
                    }
                  } catch (contractErr) {
                    console.log("reading 721 Error", contractErr)
                  }
                }
              }
            } else {
              return res.reply(messages.invalid('Seller'));
            }
          }
        }
      }
    } else {
      return res.reply(messages.invalid('Price'));
    }
  } catch (error) {
    console.log("Error " + JSON.stringify(error));
    return res.reply(messages.server_error());
  }
};




controllers.deleteOrder = async (req, res) => {
  try {
    console.log("req delete order---->", req.body);
    if (!req.userId) return res.reply(messages.unauthorized());
    let ownedQty = 0;


    /*************Deepak Code start Here*************** */
    let orderId = req.body.orderId;
    let isERC721 = req.body.isERC721;
    console.log("is erc721 is---->", isERC721)
    console.log("is orderId is---->", orderId)


    await Order.findById(orderId, async function (err, orderData) {
      if (err) {
        console.log("Error on Database Query", err);
        return res.reply(messages.error(), err.message);
      }
      if (!orderData) {
        console.log("Order not found in records");
        return res.reply(messages.not_found("order"));
      } else {


        let nftID = orderData.oNftId;
        let sellerID = orderData.oSeller;
        let QtySold = orderData.quantity_sold;
        let totalQty = orderData.oQuantity;
        let RemainingQty = parseInt(totalQty) - parseInt(QtySold);
        if (req?.body?.ownedQty !== undefined) {
          ownedQty = req.body.ownedQty;

          if (parseInt(ownedQty) < parseInt(totalQty)) {
            RemainingQty = parseInt(ownedQty)
          }
          if (RemainingQty <= 0) {
            isERC721 = true
          }
        }


        if (isERC721) {
          console.log("in deleteOrder 721")
          await Order.deleteMany({ _id: mongoose.Types.ObjectId(orderId) }).then(function () {
            console.log("Order Deleted UpdateOrder");
          }).catch(function (error) {
            console.log("Error in Order Deleted UpdateOrder", error);
          });
          await Bid.deleteMany({ oOrderId: mongoose.Types.ObjectId(orderId), oBidStatus: "Bid" }).then(function () {
            console.log("Order Bid Deleted UpdateOrder");
          }).catch(function (error) {
            console.log("Error in Bid Data Deleted UpdateOrder", error);
          });
          await Bid.deleteMany({ oOrderId: mongoose.Types.ObjectId(orderId), oBidStatus: "MakeOffer" }).then(function () {
            console.log("Make Offer Data Deleted UpdateOrder");
          }).catch(function (error) {
            console.log("Error in Bid Offer Data Deleted UpdateOrder", error);
          });
          return res.reply(messages.deleted("order"));
        } else {
          console.log("in deleteOrder 1155")
          console.log("owned quantity is---->", ownedQty)
          console.log("QtySold >= totalQty", parseInt(ownedQty) < parseInt(totalQty) - parseInt(QtySold), parseInt(ownedQty), parseInt(totalQty) - parseInt(QtySold))
          if (parseInt(ownedQty) < parseInt(totalQty) - parseInt(QtySold)) {
            await Order.findOneAndUpdate(
              { _id: mongoose.Types.ObjectId(req.body.orderId) },
              {
                $set: {
                  quantity_sold: parseInt(totalQty) - parseInt(ownedQty),
                },
              }
            ).catch((e) => {
              console.log("Error1", e.message);
            });
          }
          if (QtySold >= totalQty) {
            console.log("in deleteOrder")
            await Order.deleteMany({ _id: mongoose.Types.ObjectId(orderId) }).then(function () {
              console.log("Order Deleted UpdateOrder");
            }).catch(function (error) {
              console.log("Error in Order Deleted UpdateOrder", error);
            });
            await Bid.deleteMany({ oOrderId: mongoose.Types.ObjectId(orderId), oBidStatus: "Bid" }).then(function () {
              console.log("Order Bid Deleted UpdateOrder");
            }).catch(function (error) {
              console.log("Error in Bid Data Deleted UpdateOrder", error);
            });
            await Bid.deleteMany({ oOrderId: mongoose.Types.ObjectId(orderId), oNFTId: mongoose.Types.ObjectId(nftID), oBidStatus: "MakeOffer" }).then(function () {
              console.log("Make Offer Data Deleted UpdateOrder");
            }).catch(function (error) {
              console.log("Error in Bid Offer Data Deleted UpdateOrder", error);
            });
            return res.reply(messages.deleted("order"));
          } else {
            console.log("orderId", orderId, nftID, typeof RemainingQty)
            await Bid.deleteMany({ oOrderId: mongoose.Types.ObjectId(orderId), oNFTId: mongoose.Types.ObjectId(nftID), oBidStatus: "Bid", "oBidQuantity": { $gt: RemainingQty } }).then(function () {
              console.log("Bid Data Deleted UpdateOrder");
            }).catch(function (error) {
              console.log("Error in Bid Offer Data Deleted UpdateOrder", error);
            });
            await Bid.deleteMany({ oOrderId: mongoose.Types.ObjectId(orderId), oNFTId: mongoose.Types.ObjectId(nftID), oBidStatus: "MakeOffer", "oBidQuantity": { $gt: RemainingQty } }).then(function () {
              console.log("Offer Data Deleted UpdateOrder");
            }).catch(function (error) {
              console.log("Error in Bid Offer Data Deleted UpdateOrder", error);
            });
            return res.reply(messages.updated("order"));
          }
        }

      }
    }).catch(function (error) {
      return res.reply(messages.error(), err.message);
    });

    /*************Deepak Code ends Here*************** */

    /*************Old Code*************** */
    //console.log("in deleteOrder")
    //await Order.deleteMany({_id: mongoose.Types.ObjectId(req.body.orderId)}).then(function() {
    //  console.log("Order Deleted UpdateOrder");
    //}).catch(function(error) {
    //  console.log("Error in Order Deleted UpdateOrder",error);
    //});
    //await Bid.deleteMany({oOrderId: mongoose.Types.ObjectId(req.body.orderId),oBidStatus: "Bid"}).then(function() {
    //  console.log("Order Bid Deleted UpdateOrder");
    //}).catch(function(error) {
    //  console.log("Error in Bid Data Deleted UpdateOrder",error);
    //});
    //await Bid.deleteMany({oNFTId: mongoose.Types.ObjectId(req.body.oNftId),oBidStatus: "MakeOffer"}).then(function() {
    //  console.log("Make Offer Data Deleted UpdateOrder");
    //}).catch(function(error) {
    //  console.log("Error in Bid Offer Data Deleted UpdateOrder",error);
    //});
    //return res.reply(messages.deleted("order"));
  } catch (err) {
    return res.reply(messages.error(), err.message);
  }
};


controllers.deleteOfferOrder = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    await Order.find({ _id: req.body.orderId }).remove().exec();
    await Bid.find({ oOrderId: req.body.orderId, oBidStatus: "MakeOffer" })
      .remove()
      .exec();

    return res.reply(messages.deleted("order"));
  } catch (err) {
    console.log("err in delete Offer order is")
    return res.reply(messages.error(), err.message);
  }
};


controllers.updateOrder = async (req, res) => {
  try {
    console.log("req update order is-------->", req.body);
    let lazyMintingStatus = Number(req.body.LazyMintingStatus);
    if (lazyMintingStatus === 0) {
      lazyMintingStatus = 0;
    } else if (lazyMintingStatus === 1 || lazyMintingStatus === 2) {
      lazyMintingStatus = 2;
    }
    console.log("lazy minting status", lazyMintingStatus)
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body.oNftId) {
      return res.reply(messages.bad_request(), "oNftId is required.");
    } else {
      await Order.findOne({ _id: mongoose.Types.ObjectId(req.body.orderId) }, async function (errOrder, orderDataFound) {
        if (errOrder) {
          console.log("Error in finding Order", errOrder)
          throw errOrder;
        }
        if (orderDataFound !== undefined) {
          console.log("req body quantity sold", req.body.qty_sold)
          console.log("order data found quantity sold is--->", orderDataFound?.quantity_sold)
          let quantitySold = parseInt(req.body.qty_sold) + parseInt(orderDataFound?.quantity_sold);
          console.log("quantity sold in backend is---->", quantitySold)
          await Order.updateOne(
            { _id: req.body.orderId },
            {
              $set: {
                quantity_sold: quantitySold,
                hashStatus: req.body.hashStatus
              },
            },
            {
              upsert: true,
            },
            (err) => {
              if (err) throw error;
            }
          );
          if (parseInt(quantitySold) === parseInt(orderDataFound?.oQuantity)) {
            await Order.deleteOne({ _id: orderDataFound._id })
            console.log("order deleted")
          }
        }
      });


      await NFT.findOne({ _id: mongoose.Types.ObjectId(req.body.oNftId) }, async function (errNFT, nftDataFound) {
        const web3 = new Web3(process.env.JSON_RPC_URL);
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
              console.log("abii",ERC721ABI);
              // const contractJson = fs.readFileSync('./../../../../contract/ERC721ABI.json');

              // // Parse the JSON interface file
              // const abi = JSON.parse(contractJson);
              let con = new web3.eth.Contract(ERC721ABI, ContractAddress)
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
              let con = new web3.eth.Contract(ERC1155ABI, ContractAddress)
              let sellerCurrentQty = await con.balanceOf(sellerAddress, tokenID).call();
              let buyerCurrentQty = await con.balanceOf(buyerAddress, tokenID).call();
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

    }

    await NFT.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(req.body.oNftId) },
      {
        $set: {
          nLazyMintingStatus: Number(lazyMintingStatus),
        },
      }
    ).catch((e) => {
      console.log("Error1", e.message);
    });
    return res.reply(messages.updated("order"));
  } catch (error) {
    return res.reply(messages.error(), error.message);
  }
};

controllers.getOrder = (req, res) => {
  try {
    Order.findOne({ _id: req.body.orderId }, (err, order) => {
      if (err) return res.reply(messages.server_error());
      if (!order) return res.reply(messages.not_found("Order"));
      return res.reply(messages.no_prefix("Order Details"), order);
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getOrdersByNftId = async (req, res) => {
  try {
    //sample request
    //   {
    //     "nftId": "622191c2eea58614558fd2e7",
    //     "sortKey": "oTokenId",
    //     "sortType": -1,
    //     "page": 2,
    //     "limit": 1
    // }

    //sortKey is the column
    const sortKey = req.body.sortKey ? req.body.sortKey : oPrice;

    //sortType will let you choose from ASC 1 or DESC -1
    const sortType = req.body.sortType ? req.body.sortType : -1;

    var sortObject = {};
    var stype = sortKey;
    var sdir = sortType;
    sortObject[stype] = sdir;

    const page = parseInt(req.body.page);
    const limit = parseInt(req.body.limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    if (
      endIndex <
      (await Order.count({ oNftId: req.body.nftId }).exec())
    ) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    let AllOrders = await Order.find({
      oNftId: req.body.nftId,
    })
      .sort(sortObject)
      .limit(limit)
      .skip(startIndex)
      .exec();

    results.results = AllOrders;
    //console.log("results of get order by nft Id--->287", results)
    return res.reply(messages.success("NFT Orders List"), results);
  } catch (error) {
    return res.reply(messages.server_error(), error.message);
  }
};

module.exports = controllers;
