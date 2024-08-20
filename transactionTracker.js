/*eslint no-loop-func: */
const Web3 = require("web3");
const mongoose = require("mongoose");
const LogsDecoder = require("logs-decoder");
const ERC1155ABI = require("./abis/extendedERC1155.json");
const ERC721ABI = require("./abis/extendedERC721.json");
const logsDecoder = LogsDecoder.create();

const {
  NFT,
  Collection,
  Bid,
  Order,
  History,
} = require("./app/models");
var web3 = new Web3(process.env.NETWORK_RPC_URL);
const ABI = require("./abis/marketplace.json");
logsDecoder.addABI(ABI.abi);
const BigNumber = require("bignumber.js");

const convertToEth = (amount) => {
  return new BigNumber(amount)
    .dividedBy(new BigNumber(10).exponentiatedBy(18))
    .toString();
};

const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
};
mongoose
  .connect(process.env.DB_URL, options)
  .then(() => console.log("Database conncted"))
  .catch((error) => {
    console.log("error is",error)
    throw error;
  });


async function checkCollection() {
  try {
    console.log("Checking for Collection Hash...");
    Collection.find({ hashStatus: 0 }, async function (err, resData) {
      if (err) {
      } else {
        if (resData.length > 0) {
          for (const data of resData) {
            let dataID = await data?._id;
            let dataHash = await data?.hash;
            if (dataHash !== undefined && dataHash !== "0x0") {
              console.log("Collection Hash is", dataHash);
              let receipt = await web3.eth.getTransactionReceipt(dataHash);
              console.log("receipt is---->", receipt);
              if (receipt === null) {
                return;
              } else if (receipt.status === false) {
                let updateData = { hashStatus: 2 };
                await Collection.findByIdAndUpdate(
                  dataID,
                  updateData,
                  (err, resData) => {
                    if (resData) {
                      console.log("Updated Collection record", dataID);
                    }
                  }
                ).catch((e) => {
                  return;
                });
              } else if (receipt.status === true) {
                let contractAddress = receipt.logs[0].address;
                let updateData = {
                  hashStatus: 1,
                  contractAddress: contractAddress,
                };
                await Collection.findByIdAndUpdate(
                  dataID,
                  updateData,
                  (err, resData) => {
                    if (resData) {
                      console.log("Updated Collection record", dataID);
                    }
                  }
                ).catch((e) => {
                  return;
                });
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function checkNFTs() {
  try {
    console.log("Checking for NFT Hash...");
    NFT.find({ hashStatus: 0 }, async function (err, resData) {
      if (err) {
        console.log("Error in nft hash ", err);
      } else {
        //console.log("response data of create is---->", resData);
        if (resData.length > 0) {
          for (const data of resData) {
            console.log("data is----->", data);
            let dataID = await data?._id;
            let dataHash = await data?.hash;

            if (dataHash !== undefined && dataHash !== "0x0") {
              console.log("NFT Hash is-------->", dataHash);
              let receipt = await web3.eth.getTransactionReceipt(dataHash);
              console.log("receipt is---->", receipt);
              if (receipt === null) {
                return;
              } else if (receipt.status === false) {
                let updateData = { hashStatus: 2 };
                await NFT.findByIdAndUpdate(
                  dataID,
                  updateData,
                  (err, resData) => {
                    if (resData) {
                      console.log("Updated NFT record", dataID);
                    }
                  }
                ).catch((e) => {
                  return;
                });
              } else if (receipt.status === true) {
                let updateData = { hashStatus: 1 };
                await NFT.findByIdAndUpdate(
                  dataID,
                  updateData,
                  (err, resData) => {
                    if (resData) {
                      console.log("Updated NFT record", dataID);
                    }
                  }
                ).catch((e) => {
                  return;
                });

                //try {

                //  const insertData = new History({
                //    nftID: dataID,

                //    action: "Creation",
                //    actionMeta: "Default",

                //  });
                //  insertData.save().then(async (insresult) => {
                //    console.log("Insert Data History is " + insresult);
                //  }).catch((error) => {
                //    console.log("Error in creating Record", error);
                //  });

                // console.log("insert data is----->",insertData)
                //} catch(e) {
                //  console.log("error in history api",e);

                //  return;
                //}
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function checkOrders() {
  //console.log("numm",convertToEth("100000000000000000"))
  try {
    console.log("Checking for Order Hash...");
    let lazyMintingStatus = 1
    Order.find({ hashStatus: 0 }, async function (err, resData) {
      if (err) {
      } else {
        //console.log("response daata of order is---->", resData, resData.length);
        if (resData.length > 0) {
          console.log("in if loop");
          console.log("order id", resData)
          for (const data of resData) {
            let dataID = await data?._id;
            let dataHash = await data?.hash;
            let dataSalesType = await data?.oType;
            let dataNftID = await data?.oNftId;

            if (
              dataHash !== undefined &&
              dataHash !== "0x0" &&
              dataHash !== "" &&
              dataHash?.length >= 66
            ) {
              console.log("Order Hash", dataHash);
              web3.eth.getTransactionReceipt(
                dataHash,
                async function (e, receipt) {
                  if (receipt === null) {
                    console.log("Rec Null");
                    return;
                  }
                  if (e) {
                    console.log("error is---->", e);
                    return;
                  } else if (receipt.status === false) {
                    console.log("Inside false");
                    let updateData = { hashStatus: 2 };
                    await Order.findByIdAndUpdate(
                      dataID,
                      updateData,
                      (err, resData) => {
                        if (resData) {
                          console.log("Updated Order record", dataID);
                        }
                      }
                    ).catch((e) => {
                      return;
                    });
                  } else if (receipt.status === true) {
                    console.log("Inside True", receipt, receipt.logs);
                    const decodedLogs = logsDecoder.decodeLogs(receipt.logs);
                    console.log("data iss", decodedLogs);
                    let saleData = [];
                    if (dataSalesType === 1) {
                      console.log("hereee1111", decodedLogs[5]);
                      if (
                        decodedLogs[7]?.events !== undefined &&
                        decodedLogs[7]?.events.length === 6
                      ) {
                        saleData = decodedLogs[7]?.events;
                      }
                      if (
                        decodedLogs[6]?.events !== undefined &&
                        decodedLogs[6]?.events.length === 6
                      ) {
                        saleData = decodedLogs[6]?.events;
                      }
                      if (
                        decodedLogs[5]?.events !== undefined &&
                        decodedLogs[5]?.events.length === 6
                      ) {
                        saleData = decodedLogs[5]?.events;
                      }
                      if (
                        decodedLogs[4]?.events !== undefined &&
                        decodedLogs[4]?.events.length === 6
                      ) {
                        saleData = decodedLogs[4]?.events;
                      }
                    } else {
                      console.log("hereee222", decodedLogs);
                      if (
                        decodedLogs[4]?.events !== undefined &&
                        decodedLogs[4]?.events.length === 6
                      ) {
                        saleData = decodedLogs[4]?.events;
                      }
                      if (
                        decodedLogs[5]?.events !== undefined &&
                        decodedLogs[5]?.events.length === 6
                      ) {
                        saleData = decodedLogs[5]?.events;
                      }
                      if (
                        decodedLogs[7]?.events !== undefined &&
                        decodedLogs[7]?.events.length === 6
                      ) {
                        saleData = decodedLogs[7]?.events;
                      }
                      if (
                        decodedLogs[6]?.events !== undefined &&
                        decodedLogs[6]?.events.length === 6
                      ) {
                        saleData = decodedLogs[6]?.events;
                      }
                    }
                    console.log("saleData CheckOrder after", saleData);
                    let orderID = dataID;
                    let nftID = dataNftID;
                    let buyer = "";
                    let seller = "";
                    let tokenAddress = "";
                    let tokenId = "";
                    let amount = "";
                    let bidsamount = "";
                    let quantity = "";
                    try {
                      console.log("saleData CheckOrder", saleData);
                      for (const sales of saleData) {
                        if (sales.name === "buyer") {
                          buyer = sales.value;
                        }
                        if (sales.name === "seller") {
                          seller = sales.value;
                        }
                        if (sales.name === "tokenAddress") {
                          tokenAddress = sales.value;
                        }
                        if (sales.name === "tokenId") {
                          tokenId = sales.value;
                        }
                        if (sales.name === "amount") {
                          amount = sales.value;
                          bidsamount = sales.value;
                        }
                        if (sales.name === "quantity") {
                          quantity = sales.value;
                        }
                      }
                      console.log("Order", seller + " " + buyer);

                      await Order.findOne(
                        { _id: mongoose.Types.ObjectId(orderID) },
                        async function (errOrder, orderDataFound) {
                          if (errOrder) {
                            console.log("Error n update", errOrder);
                            throw errOrder;
                          }
                          console.log("order data found is------>", orderDataFound)
                          if (orderDataFound !== undefined) {
                            let quantitySold =
                              parseInt(quantity) +
                              parseInt(orderDataFound?.quantity_sold);
                            console.log("quantitiy soled is------->", quantitySold, quantity)
                            await Order.updateOne(
                              { _id: orderID },
                              {
                                $set: {
                                  quantity_sold: quantitySold,
                                },
                              },
                              {
                                upsert: true,
                              },
                              (err) => {
                                if (err) throw err;
                              }
                            );
                          }
                        }
                      );

                      await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) }, async function (errNFT, nftDataFound) {
                        if (errNFT) {
                          console.log("Error in finding NFT", errNFT)
                          throw errNFT;
                        }
                        if (nftDataFound !== undefined) {
                          let ContractAddress = nftDataFound?.nCollection;
                          let tokenID = nftDataFound?.nTokenID;
                          let ERCType = nftDataFound?.nType;
                          if (ContractAddress !== undefined) {
                            let sellerAddress = seller.toLowerCase();
                            let buyerAddress = buyer.toLowerCase();
                            if (ERCType === 1) {
                              await Order.deleteMany({ oNftId: mongoose.Types.ObjectId(nftID) })
                              let con = new web3.eth.Contract(ERC721ABI.abi, ContractAddress)
                              let currentOwnerAddress = await con.methods.ownerOf(tokenID).call();
                              let OwnedBy = [];
                              OwnedBy.push({
                                address: currentOwnerAddress.toLowerCase(),
                                quantity: 1,
                              });
                              let updateNFTData = { ownedBy: OwnedBy }
                              await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(nftID) },
                                { $set: updateNFTData }, { new: true }, async function (errUpdate, updateNFT) {
                                  if (errUpdate) {
                                    console.log("Error in Updating Qty ERC 721", errUpdate);
                                  }
                                });
                            } else {
                              let con = new web3.eth.Contract(ERC1155ABI.abi, ContractAddress)
                              let sellerCurrentQty = await con.methods.balanceOf(sellerAddress, tokenID).call();
                              let buyerCurrentQty = await con.methods.balanceOf(buyerAddress, tokenID).call();
                              let isExist = await NFT.exists(
                                {
                                  _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": sellerAddress
                                })

                              if (parseInt(sellerCurrentQty) === 0 || sellerCurrentQty === undefined) {
                                await NFT.findOneAndUpdate(
                                  { _id: mongoose.Types.ObjectId(nftID) },
                                  { $pull: { nOwnedBy: { address: sellerAddress } } }
                                ).catch((e) => {
                                  console.log("Error in Deleting Seller Qty ", e.message);
                                });
                              } else if (parseInt(sellerCurrentQty) > 0 && isExist) {
                                await NFT.findOneAndUpdate(
                                  { _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": sellerAddress },
                                  { $set: { "nOwnedBy.$.quantity": parseInt(sellerCurrentQty) } }
                                ).catch((e) => {
                                  console.log("Error2", e.message);
                                });
                              }
                              else if (parseInt(sellerCurrentQty) > 0) {
                                await NFT.findOneAndUpdate(
                                  { _id: mongoose.Types.ObjectId(nftID) },
                                  { $push: { nOwnedBy: { address: sellerAddress, quantity: parseInt(sellerCurrentQty) } } }
                                ).catch((e) => {
                                  console.log("Error2", e.message);
                                });
                              }

                              isExist = await NFT.exists(
                                {
                                  _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": buyerAddress
                                })


                              if (parseInt(buyerCurrentQty) === 0 || buyerCurrentQty === undefined) {
                                await NFT.findOneAndUpdate(
                                  { _id: mongoose.Types.ObjectId(nftID) },
                                  { $pull: { nOwnedBy: { address: buyerAddress } } }
                                ).catch((e) => {
                                  console.log("Error in Deleting Seller Qty ", e.message);
                                });
                              } else if (parseInt(buyerCurrentQty) > 0 && isExist) {
                                await NFT.findOneAndUpdate(
                                  { _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": buyerAddress },
                                  { $set: { "nOwnedBy.$.quantity": parseInt(buyerCurrentQty) } }
                                ).catch((e) => {
                                  console.log("Error2", e.message);
                                });
                              }
                              else if (parseInt(buyerCurrentQty) > 0) {
                                await NFT.findOneAndUpdate(
                                  { _id: mongoose.Types.ObjectId(nftID) },
                                  { $push: { nOwnedBy: { address: buyerAddress, quantity: parseInt(buyerCurrentQty) } } }
                                ).catch((e) => {
                                  console.log("Error2", e.message);
                                });
                              }
                            }

                          } else {
                            console.log("Error in finding Collection", nftDataFound)
                            // return res.reply(messages.not_found(), "Collection Not found.");
                          }
                        } else {
                          console.log("Error in finding NFT Data", nftDataFound)
                          // return res.reply(messages.not_found(), "NFT.");
                        }
                      });


                      if (Number(lazyMintingStatus === 1)) {
                        await NFT.findOneAndUpdate(
                          { _id: mongoose.Types.ObjectId(nftID) },
                          {
                            $set: {
                              nLazyMintingStatus: 2,
                            },
                          }
                        ).catch((e) => {
                          console.log("Error1", e.message);
                        });
                      }

                      let _NFT = await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) })
                      let isERC721 = _NFT?.nType;
                      await Order.findById(
                        orderID,
                        async function (err, orderData) {
                          if (err) {
                            console.log("Error on Database Query", err);
                            return;
                          }
                          if (!orderData) {
                            console.log("Order not found in records");
                            return;
                          } else {
                            let nftID = orderData.oNftId;
                            let sellerID = orderData.oSeller;
                            let QtySold = orderData.quantity_sold;
                            let totalQty = orderData.oQuantity;

                            let RemainingQty =
                              parseInt(totalQty) - parseInt(QtySold);

                            if (isERC721 === 1) {
                              console.log("in deleteOrder");
                              await Order.deleteMany({
                                _id: mongoose.Types.ObjectId(orderID),
                              })
                                .then(function () {
                                  console.log("Order Deleted UpdateOrder");
                                })
                                .catch(function (error) {
                                  console.log(
                                    "Error in Order Deleted UpdateOrder",
                                    error
                                  );
                                });
                              await Bid.deleteMany({
                                oOrderId: mongoose.Types.ObjectId(orderID),
                                oBidStatus: "Bid",
                              })
                                .then(function () {
                                  console.log("Order Bid Deleted UpdateOrder");
                                })
                                .catch(function (error) {
                                  console.log(
                                    "Error in Bid Data Deleted UpdateOrder",
                                    error
                                  );
                                });
                              await Bid.deleteMany({
                                oOrderId: mongoose.Types.ObjectId(orderID),
                                oBidStatus: "MakeOffer",
                              })
                                .then(function () {
                                  console.log(
                                    "Make Offer Data Deleted UpdateOrder"
                                  );
                                })
                                .catch(function (error) {
                                  console.log(
                                    "Error in Bid Offer Data Deleted UpdateOrder",
                                    error
                                  );
                                });
                            } else {
                              if (QtySold >= totalQty) {
                                console.log("in deleteOrder");
                                await Order.deleteMany({
                                  _id: mongoose.Types.ObjectId(orderID),
                                })
                                  .then(function () {
                                    console.log("Order Deleted UpdateOrder");
                                  })
                                  .catch(function (error) {
                                    console.log(
                                      "Error in Order Deleted UpdateOrder",
                                      error
                                    );
                                  });
                                await Bid.deleteMany({
                                  oOrderId: mongoose.Types.ObjectId(orderID),
                                  oBidStatus: "Bid",
                                })
                                  .then(function () {
                                    console.log(
                                      "Order Bid Deleted UpdateOrder"
                                    );
                                  })
                                  .catch(function (error) {
                                    console.log(
                                      "Error in Bid Data Deleted UpdateOrder",
                                      error
                                    );
                                  });
                                await Bid.deleteMany({
                                  oOrderId: mongoose.Types.ObjectId(orderID),
                                  oNFTId: mongoose.Types.ObjectId(nftID),
                                  oBidStatus: "MakeOffer",
                                })
                                  .then(function () {
                                    console.log(
                                      "Make Offer Data Deleted UpdateOrder"
                                    );
                                  })
                                  .catch(function (error) {
                                    console.log(
                                      "Error in Bid Offer Data Deleted UpdateOrder",
                                      error
                                    );
                                  });
                              } else {
                                await Bid.deleteMany({
                                  oOrderId: mongoose.Types.ObjectId(orderID),
                                  oNFTId: mongoose.Types.ObjectId(nftID),
                                  oBidStatus: "MakeOffer",
                                  oBidQuantity: { $gt: RemainingQty },
                                })
                                  .then(function () {
                                    console.log(
                                      "Make Offer Data Deleted UpdateOrder"
                                    );
                                  })
                                  .catch(function (error) {
                                    console.log(
                                      "Error in Bid Offer Data Deleted UpdateOrder",
                                      error
                                    );
                                  });
                              }
                            }
                          }
                        }
                      ).catch(function (error) {
                        return;
                      });
                    } catch (error) {
                      console.log(
                        "Error in Processing - CheckOrder API",
                        error
                      );
                      return;
                    }

                    try {
                      const insertData = new History({
                        nftId: nftID,
                        action: "Purchase",
                        actionMeta: "Default",
                        message: `${parseInt(
                          quantity
                        )} Quantity For ${convertToEth(bidsamount)} Matic by ${buyer.slice(0, 3) + "..." + buyer.slice(39, 42)
                          }`,
                        hash: dataHash
                      });

                      await History.findOne({ hash: dataHash },
                        async (err, record) => {
                          if (err) {
                            console.log("Error in fetching History Records ", err)
                            return;
                          }
                          if (!record) {
                            insertData.save().then(async (result) => {
                              return;
                            }).catch((error) => {
                              console.log("Error in creating Record", error);
                              return;
                            });
                          } else {
                            let updateHistoryData = {
                              nftId: nftID,
                              action: "Purchase",
                              actionMeta: "Default",
                              message: `${parseInt(
                                quantity
                              )} Quantity For ${convertToEth(bidsamount)} Matic by ${buyer.slice(0, 3) + "..." + buyer.slice(39, 42)
                                }`,
                              hash: dataHash
                            }
                            await History.findOneAndUpdate(
                              { _id: mongoose.Types.ObjectId(record._id) },
                              { $set: updateHistoryData }, { new: true }, function (err, updateHistory) {
                                if (err) {
                                  console.log("Error in Updating History" + err);
                                  return;
                                } else {
                                  console.log("History Updated: ", updateHistory);
                                  return;
                                }
                              }
                            );
                          }
                        }
                      )

                      //insertData
                      //  .save()
                      //  .then(async (insresult) => {
                      //    console.log("Insert Data History is "+insresult);
                      //  })
                      //  .catch((error) => {
                      //    console.log("Error in creating Record",error);
                      //  });

                      //console.log("insert data is----->",insertData);
                    } catch (e) {
                      console.log("error in history api", e);

                      return;
                    }

                    let updateData = { hashStatus: 1 };
                    console.log("start");
                    await Order.findByIdAndUpdate(
                      orderID,
                      updateData,
                      async (err, resData) => {
                        console.log("resData", resData);
                        if (resData) {
                          console.log("Updated Order record", orderID);
                        }
                      }
                    ).catch((e) => {
                      return;
                    });
                  }
                }
              );
            }
          }
        }
      }
    });
    console.log("updated through cron");
  } catch (error) {
    console.log("Error is", error);
  }
}

async function checkBids() {
  try {
    console.log("Checking for Bid Hash...");
    let totalQty = 0
    Bid.find(
      { hashStatus: 0, oBidStatus: "Bid" },
      async function (err, resData) {
        if (err) {
          console.log("error is ", err);
        } else {
          if (resData.length > 0) {
            console.log("resData of bid is---->", resData);
            for (const data of resData) {
              let dataID = await data?._id;
              let dataHash = await data?.hash;
              let dataNftID = await data?.oNFTId;
              let dataOwner = await data?.oOwner;
              let orderID = await data?.oOrderId;
              let dataHashStatus = await data?.hashStatus;
              let lazyMintingStatus = 1;

              let Nft = await NFT.findOne({
                _id: mongoose.Types.ObjectId(dataNftID),
              });
              let isERC721 = Nft?.nType;
              lazyMintingStatus = Nft?.nLazyMintingStatus;
              if (isERC721 === 1) {
                await Order.deleteMany({ oNftId: mongoose.Types.ObjectId(dataNftID) })
              }

              if (
                dataHash !== undefined &&
                dataHash !== "0x0" &&
                dataHashStatus !== 1
              ) {
                console.log("bid Hash", dataHash);

                web3.eth.getTransactionReceipt(
                  dataHash,
                  async function (e, receipt) {
                    if (receipt === null) {
                      console.log("Rec Null");
                      return;
                    } else if (receipt.status === false) {
                      let updateData = { hashStatus: 2 };
                      await Bid.findByIdAndUpdate(
                        dataID,
                        updateData,
                        (err, resData) => {
                          if (resData) {
                            console.log("Updated Bid record", dataID);
                          }
                        }
                      ).catch((e) => {
                        return;
                      });
                    } else if (receipt.status === true) {
                      let saleData;
                      const decodedLogs = logsDecoder.decodeLogs(receipt.logs);
                      if (
                        decodedLogs[8]?.events !== undefined &&
                        decodedLogs[8]?.events.length === 6
                      ) {
                        saleData = decodedLogs[8]?.events;
                      }
                      if (
                        decodedLogs[7]?.events !== undefined &&
                        decodedLogs[7]?.events.length === 6
                      ) {
                        saleData = decodedLogs[7]?.events;
                      }
                      console.log("saleData in bid", saleData);
                      let bidID = dataID;
                      let nftID = dataNftID;
                      let buyer = "";
                      let seller = "";
                      let tokenAddress = "";
                      let tokenId = "";
                      let bidsamount = "";
                      let quantity = "";

                      try {
                        console.log("saleData CheckOrder", saleData);
                        for (const sales of saleData) {
                          if (sales.name === "buyer") {
                            buyer = sales.value;
                          }
                          if (sales.name === "seller") {
                            seller = sales.value;
                          }

                          if (sales.name === "amount") {
                            bidsamount = sales.value;
                          }
                          if (sales.name === "quantity") {
                            quantity = sales.value;
                          }
                        }
                        let boughtQty = parseInt(quantity);
                        console.log("Order", seller + " " + buyer);

                        let _order = await Order.findOne({
                          _id: mongoose.Types.ObjectId(orderID),
                        });
                        let qty_sold = parseInt(
                          _order.quantity_sold + boughtQty
                        );
                        totalQty = _order.oQuantity
                        console.log("qauntity sold is---->", qty_sold);
                        console.log(
                          "db quantitiy sold is------>905",
                          _order.quantity_sold
                        );
                        console.log(
                          "db quantitiy sold is------>905",
                          boughtQty
                        );

                        await Order.updateOne(
                          { _id: orderID },
                          {
                            $set: {
                              quantity_sold: qty_sold,
                            },
                          },
                          {
                            upsert: true,
                          },
                          (err) => {
                            if (err) return;
                          }
                        );

                        let _NFT = await NFT.findOne({
                          _id: mongoose.Types.ObjectId(nftID),
                          "nOwnedBy.address": seller,
                        }).select("nOwnedBy -_id");
                        console.log("_NFT-------->", _NFT);
                        let currentQty = _NFT.nOwnedBy.find(
                          (o) => o.address === seller.toLowerCase()
                        ).quantity;

                        let leftQty = parseInt(currentQty - boughtQty);
                        if (leftQty < 1) {
                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            {
                              $pull: {
                                nOwnedBy: { address: seller.toLowerCase() },
                              },
                            }
                          ).catch((e) => {
                            console.log("Error1", e.message);
                          });
                        } else {
                          await NFT.findOneAndUpdate(
                            {
                              _id: mongoose.Types.ObjectId(nftID),
                              "nOwnedBy.address": seller.toLowerCase(),
                            },
                            {
                              $set: {
                                "nOwnedBy.$.quantity": parseInt(leftQty),
                              },
                            }
                          ).catch((e) => {
                            console.log("Error2", e.message);
                          });
                        }
                        //Credit the buyer
                        console.log("Crediting Buyer");
                        let subDocId = await NFT.exists({
                          _id: mongoose.Types.ObjectId(nftID),
                          "nOwnedBy.address": buyer.toLowerCase(),
                        });
                        if (subDocId) {
                          console.log("Subdocument Id", subDocId);
                          let _NFTB = await NFT.findOne({
                            _id: mongoose.Types.ObjectId(nftID),
                            "nOwnedBy.address": buyer.toLowerCase(),
                          }).select("nOwnedBy -_id");
                          console.log("_NFTB-------->", _NFTB);
                          console.log(
                            "Quantity found for buyers",
                            _NFTB.nOwnedBy.find(
                              (o) => o.address === buyer.toLowerCase()
                            ).quantity
                          );

                          currentQty = _NFTB.nOwnedBy.find(
                            (o) => o.address === buyer.toLowerCase()
                          ).quantity
                            ? parseInt(
                              _NFTB.nOwnedBy.find(
                                (o) => o.address === buyer.toLowerCase()
                              ).quantity
                            )
                            : 0;

                          let ownedQty = parseInt(currentQty + boughtQty);
                          await NFT.findOneAndUpdate(
                            {
                              _id: mongoose.Types.ObjectId(nftID),
                              "nOwnedBy.address": buyer.toLowerCase(),
                            },
                            {
                              $set: {
                                "nOwnedBy.$.quantity": parseInt(ownedQty),
                              },
                            },
                            { upsert: true, runValidators: true }
                          ).catch((e) => {
                            console.log("Error1", e.message);
                          });
                        } else {
                          console.log("Subdocument Id not found");
                          let dataToadd = {
                            address: buyer.toLowerCase(),
                            quantity: parseInt(boughtQty),
                          };
                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            { $addToSet: { nOwnedBy: dataToadd } },
                            { upsert: true }
                          );

                          console.log("wasn't there but added");
                        }

                        await Bid.findOneAndUpdate(
                          {
                            _id: mongoose.Types.ObjectId(bidID),
                          },
                          { oBidStatus: "Accepted" },
                          function (err, acceptBid) {
                            if (err) {
                              console.log("Error in Accepting Bid" + err);
                              return;
                            } else {
                              console.log("Bid Accepted : ", acceptBid);
                            }
                          }
                        );
                        console.log("ERC721 is", isERC721);
                        if (isERC721 === 1) {
                          console.log("in erc721", isERC721);

                          await Bid.deleteMany({
                            oOwner: mongoose.Types.ObjectId(dataOwner),
                            oNFTId: mongoose.Types.ObjectId(dataNftID),
                            oBidStatus: "Bid",
                          })
                            .then(function () {
                              console.log("Data deleted");
                            })
                            .catch(function (error) {
                              console.log(error);
                            });
                          await Bid.deleteMany({
                            oOwner: mongoose.Types.ObjectId(dataOwner),
                            oNFTId: mongoose.Types.ObjectId(dataNftID),
                            oBidStatus: "MakeOffer",
                          })
                            .then(function () {
                              console.log("Data deleted");
                            })
                            .catch(function (error) {
                              console.log(error);
                            });

                          await Order.deleteOne({
                            _id: mongoose.Types.ObjectId(orderID),
                          });
                        } else {
                          console.log("in erc1155", isERC721);
                          let _order = await Order.findOne({
                            _id: mongoose.Types.ObjectId(orderID),
                          });
                          let leftQty = parseInt(
                            _order.oQuantity - _order.quantity_sold
                          );
                          if (leftQty <= 0) {
                            await Order.deleteOne({
                              _id: mongoose.Types.ObjectId(orderID),
                            });
                          }
                          console.log(
                            "left qty 1155 in accept offer is---->",
                            leftQty
                          );
                          if (leftQty === 1 || leftQty == 0) {
                            await Bid.deleteMany({
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
                              oBidStatus: "Bid",
                            })
                              .then(function () {
                                console.log("Data deleted");
                              })
                              .catch(function (error) {
                                console.log(error);
                              });
                            await Bid.deleteMany({
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
                              oBidStatus: "MakeOffer",
                            })
                              .then(function () {
                                //console.log("Data deleted");
                              })
                              .catch(function (error) {
                                console.log(error);
                              });
                          } else {
                            await Bid.deleteMany({
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
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
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
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
                        }
                        if (Number(lazyMintingStatus === 1)) {
                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            {
                              $set: {
                                nLazyMintingStatus: 2,
                              },
                            }
                          ).catch((e) => {
                            console.log("Error1", e.message);
                          });
                        } else {
                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            {
                              $set: {
                                nLazyMintingStatus: Number(lazyMintingStatus),
                              },
                            }
                          ).catch((e) => {
                            console.log("Error1", e.message);
                          });
                        }
                      } catch (error) {
                        console.log(
                          "Error in Processing - CheckOrder API",
                          error
                        );
                        return;
                      }
                      console.log("before history", dataHash, dataNftID)
                      try {
                        const insertData = new History({
                          nftId: dataNftID,
                          //userId: nftDetails.nCreater._id,

                          action: "Bids",
                          actionMeta: "Accept",
                          message: `Bid accepted for ${quantity} of ${totalQty} editions at ${convertToEth(bidsamount)} USDT by ${seller}`,
                          hash: dataHash
                        });

                        insertData.hash = dataHash;
                        await History.findOne({ hash: dataHash },
                          async (err, record) => {
                            if (err) {
                              console.log("Error in fetching History Records ", err)
                              return;
                            }
                            if (!record) {
                              insertData.save().then(async (result) => {
                                return;
                              }).catch((error) => {
                                console.log("Error in creating Record", error);
                                return;
                              });
                            } else {
                              let updateHistoryData = {
                                nftId: dataNftID,
                                //userId: nftDetails.nCreater._id,

                                action: "Bids",
                                actionMeta: "Accept",
                                message: `Bid accepted for ${quantity} of ${totalQty} editions at ${convertToEth(bidsamount)} USDT by ${seller.slice(
                                  0,
                                  3
                                ) +
                                  "..." +
                                  seller.slice(
                                    39,
                                    42
                                  )}`,
                                hash: dataHash
                              }
                              await History.findOneAndUpdate(
                                { _id: mongoose.Types.ObjectId(record._id) },
                                { $set: updateHistoryData }, { new: true }, function (err, updateHistory) {
                                  if (err) {
                                    console.log("Error in Updating History" + err);
                                    return;
                                  } else {
                                    console.log("History Updated: ", updateHistory);
                                    return;
                                  }
                                }
                              );
                            }
                          }
                        )

                      } catch (e) {
                        console.log("error in history api", e);

                        return;
                      }
                      console.log("after history", dataHash)


                      let updateData = { hashStatus: 1 };
                      console.log("start");
                      await Order.findByIdAndUpdate(
                        orderID,
                        updateData,
                        async (err, resData) => {
                          console.log("resData", resData);
                          if (resData) {
                            console.log("Updated Order record", orderID);
                          }
                        }
                      ).catch((e) => {
                        return;
                      });
                    }
                  }
                );
              }
            }
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
}


async function checkOffers() {
  try {
    console.log("Checking for Offer Hash...");
    let totalQty = 0
    Bid.find(
      { hashStatus: 0, oBidStatus: "MakeOffer" },
      async function (err, resData) {
        if (err) {
          console.log("error is ", err);
        } else {
          if (resData.length > 0) {

            for (const data of resData) {
              let dataID = await data?._id;
              let dataHash = await data?.hash;
              let dataNftID = await data?.oNFTId;
              let dataOwner = await data?.oOwner;
              let orderID = await data?.oOrderId;

              let dataHashStatus = await data?.hashStatus;
              let lazyMintingStatus;

              let Nft = await NFT.findOne({
                _id: mongoose.Types.ObjectId(dataNftID),
              });
              let isERC721 = Nft?.nType;
              lazyMintingStatus = Nft?.nLazyMintingStatus;

              if (isERC721 === 1) {
                await Order.deleteMany({ oNftId: mongoose.Types.ObjectId(dataNftID) })
              }

              if (
                dataHash !== undefined &&
                dataHash !== "0x0" &&
                dataHashStatus !== 1
              ) {
                console.log("Offer Hash", dataHash);

                web3.eth.getTransactionReceipt(
                  dataHash,
                  async function (e, receipt) {
                    if (receipt === null) {
                      console.log("Rec Null");
                      return;
                    } else if (receipt.status === false) {
                      let updateData = { hashStatus: 2 };
                      await Bid.findByIdAndUpdate(
                        dataID,
                        updateData,
                        (err, resData) => {
                          if (resData) {
                            console.log("Updated Bid record", dataID);
                          }
                        }
                      ).catch((e) => {
                        return;
                      });
                    } else if (receipt.status === true) {
                      let saleData;
                      const decodedLogs = logsDecoder.decodeLogs(receipt.logs);
                      if (
                        decodedLogs[8]?.events !== undefined &&
                        decodedLogs[8]?.events.length === 6
                      ) {
                        saleData = decodedLogs[8]?.events;
                      }
                      if (
                        decodedLogs[7]?.events !== undefined &&
                        decodedLogs[7]?.events.length === 6
                      ) {
                        saleData = decodedLogs[7]?.events;
                      }
                      console.log("saleData in offer", saleData);
                      let bidID = dataID;
                      let nftID = dataNftID;
                      let buyer = "";
                      let seller = "";
                      let bidsamount = "";
                      let quantity = "";

                      try {
                        console.log("saleData CheckOrder", saleData);
                        for (const sales of saleData) {
                          if (sales.name === "buyer") {
                            buyer = sales.value;
                          }
                          if (sales.name === "seller") {
                            seller = sales.value;
                          }

                          if (sales.name === "amount") {
                            bidsamount = sales.value;
                          }
                          if (sales.name === "quantity") {
                            quantity = sales.value;
                          }
                        }
                        let boughtQty = parseInt(quantity);
                        console.log("Order", seller + " " + buyer);

                        let _order = await Order.findOne({
                          _id: mongoose.Types.ObjectId(orderID),
                        });
                        let qty_sold = parseInt(
                          _order.quantity_sold + boughtQty
                        );
                        totalQty = _order.oQuantity
                        console.log("qauntity sold is---->", qty_sold);
                        console.log(
                          "db quantitiy sold is------>905",
                          _order.quantity_sold
                        );
                        console.log(
                          "db quantitiy sold is------>905",
                          boughtQty
                        );

                        await Order.updateOne(
                          { _id: orderID },
                          {
                            $set: {
                              quantity_sold: qty_sold,
                            },
                          },
                          {
                            upsert: true,
                          },
                          (err) => {
                            if (err) return;
                          }
                        );

                        await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) }, async function (errNFT, nftDataFound) {
                          if (errNFT) {
                            console.log("Error in finding NFT", errNFT)
                            throw errNFT;
                          }
                          if (nftDataFound !== undefined) {
                            let ContractAddress = nftDataFound?.nCollection;
                            let tokenID = nftDataFound?.nTokenID;
                            let ERCType = nftDataFound?.nType;
                            if (ContractAddress !== undefined) {
                              let sellerAddress = seller.toLowerCase();
                              let buyerAddress = buyer.toLowerCase();
                              if (ERCType === 1) {
                                let con = new web3.eth.Contract(ERC721ABI.abi, ContractAddress)
                                let currentOwnerAddress = await con.methods.ownerOf(tokenID).call();
                                let OwnedBy = [];
                                OwnedBy.push({
                                  address: currentOwnerAddress.toLowerCase(),
                                  quantity: 1,
                                });
                                let updateNFTData = { nOwnedBy: OwnedBy }
                                await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(nftID) },
                                  { $set: updateNFTData }, { new: true }, async function (errUpdate, updateNFT) {
                                    if (errUpdate) {
                                      console.log("Error in Updating Qty ERC 721", errUpdate);
                                    }
                                  });
                              } else {
                                let con = new web3.eth.Contract(ERC1155ABI.abi, ContractAddress)
                                let sellerCurrentQty = await con.methods.balanceOf(sellerAddress, tokenID).call();
                                let buyerCurrentQty = await con.methods.balanceOf(buyerAddress, tokenID).call();
                                let isExist = await NFT.exists(
                                  {
                                    _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": sellerAddress
                                  })

                                if (parseInt(sellerCurrentQty) === 0 || sellerCurrentQty === undefined) {
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    { $pull: { nOwnedBy: { address: sellerAddress } } }
                                  ).catch((e) => {
                                    console.log("Error in Deleting Seller Qty ", e.message);
                                  });
                                } else if (parseInt(sellerCurrentQty) > 0 && isExist) {
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": sellerAddress },
                                    { $set: { "nOwnedBy.$.quantity": parseInt(sellerCurrentQty) } }
                                  ).catch((e) => {
                                    console.log("Error2", e.message);
                                  });
                                }
                                else if (parseInt(sellerCurrentQty) > 0) {
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    { $push: { nOwnedBy: { address: sellerAddress, quantity: parseInt(sellerCurrentQty) } } }
                                  ).catch((e) => {
                                    console.log("Error2", e.message);
                                  });
                                }

                                isExist = await NFT.exists(
                                  {
                                    _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": buyerAddress
                                  })


                                if (parseInt(buyerCurrentQty) === 0 || buyerCurrentQty === undefined) {
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    { $pull: { nOwnedBy: { address: buyerAddress } } }
                                  ).catch((e) => {
                                    console.log("Error in Deleting Seller Qty ", e.message);
                                  });
                                } else if (parseInt(buyerCurrentQty) > 0 && isExist) {
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID), "nOwnedBy.address": buyerAddress },
                                    { $set: { "nOwnedBy.$.quantity": parseInt(buyerCurrentQty) } }
                                  ).catch((e) => {
                                    console.log("Error2", e.message);
                                  });
                                }
                                else if (parseInt(buyerCurrentQty) > 0) {
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    { $push: { nOwnedBy: { address: buyerAddress, quantity: parseInt(buyerCurrentQty) } } }
                                  ).catch((e) => {
                                    console.log("Error2", e.message);
                                  });
                                }
                              }

                            } else {
                              console.log("Error in finding Collection", nftDataFound)
                              return
                            }
                          } else {
                            console.log("Error in finding NFT Data", nftDataFound)
                            return
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
                              return;
                            } else {
                              console.log("Bid Accepted : ", acceptBid);
                            }
                          }
                        );
                        console.log("ERC721 is", isERC721);
                        if (isERC721 === 1) {
                          console.log("in erc721", isERC721);

                          await Bid.deleteMany({
                            oOwner: mongoose.Types.ObjectId(dataOwner),
                            oNFTId: mongoose.Types.ObjectId(dataNftID),
                            oBidStatus: "Bid",
                          })
                            .then(function () {
                              console.log("Data deleted");
                            })
                            .catch(function (error) {
                              console.log(error);
                            });
                          await Bid.deleteMany({
                            oOwner: mongoose.Types.ObjectId(dataOwner),
                            oNFTId: mongoose.Types.ObjectId(dataNftID),
                            oBidStatus: "MakeOffer",
                          })
                            .then(function () {
                              console.log("Data deleted");
                            })
                            .catch(function (error) {
                              console.log(error);
                            });

                          await Order.deleteOne({
                            _id: mongoose.Types.ObjectId(orderID),
                          });
                        } else {
                          console.log("in erc1155", isERC721);
                          let _order = await Order.findOne({
                            _id: mongoose.Types.ObjectId(orderID),
                          });
                          let leftQty = parseInt(
                            _order.oQuantity - _order.quantity_sold
                          );
                          if (leftQty <= 0) {
                            await Order.deleteOne({
                              _id: mongoose.Types.ObjectId(orderID),
                            });
                          }
                          console.log(
                            "left qty 1155 in accept offer is---->",
                            leftQty
                          );
                          if (leftQty === 1 || leftQty == 0) {
                            await Bid.deleteMany({
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
                              oBidStatus: "Bid",
                            })
                              .then(function () {
                                console.log("Data deleted");
                              })
                              .catch(function (error) {
                                console.log(error);
                              });
                            await Bid.deleteMany({
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
                              oBidStatus: "MakeOffer",
                            })
                              .then(function () {
                                //console.log("Data deleted");
                              })
                              .catch(function (error) {
                                console.log(error);
                              });
                          } else {
                            await Bid.deleteMany({
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
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
                              oOwner: mongoose.Types.ObjectId(dataOwner),
                              oNFTId: mongoose.Types.ObjectId(dataNftID),
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
                        }
                        if (Number(lazyMintingStatus === 1)) {
                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            {
                              $set: {
                                nLazyMintingStatus: 2,
                              },
                            }
                          ).catch((e) => {
                            console.log("Error1", e.message);
                          });
                        } else {
                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            {
                              $set: {
                                nLazyMintingStatus: Number(lazyMintingStatus),
                              },
                            }
                          ).catch((e) => {
                            console.log("Error1", e.message);
                          });
                        }
                      } catch (error) {
                        console.log(
                          "Error in Processing - CheckOrder API",
                          error
                        );
                        return;
                      }
                      console.log("before history", dataHash, dataNftID)
                      try {
                        const insertData = new History({
                          nftId: dataNftID,
                          //userId: nftDetails.nCreater._id,

                          action: "Offers",
                          actionMeta: "Accept",
                          message: `Offer accepted for ${quantity} of ${totalQty} editions at ${convertToEth(bidsamount)} USDT by ${seller}`,
                          hash: dataHash
                        });

                        insertData.hash = dataHash;
                        await History.findOne({ hash: dataHash },
                          async (err, record) => {
                            if (err) {
                              console.log("Error in fetching History Records ", err)
                              return;
                            }
                            if (!record) {
                              insertData.save().then(async (result) => {
                                return;
                              }).catch((error) => {
                                console.log("Error in creating Record", error);
                                return;
                              });
                            } else {
                              let updateHistoryData = {
                                nftId: dataNftID,
                                //userId: nftDetails.nCreater._id,

                                action: "Offers",
                                actionMeta: "Accept",
                                message: `Offer accepted for ${quantity} of ${totalQty} editions at ${convertToEth(bidsamount)} USDT by ${seller.slice(
                                  0,
                                  3
                                ) +
                                  "..." +
                                  seller.slice(
                                    39,
                                    42
                                  )}`,
                                hash: dataHash
                              }
                              await History.findOneAndUpdate(
                                { _id: mongoose.Types.ObjectId(record._id) },
                                { $set: updateHistoryData }, { new: true }, function (err, updateHistory) {
                                  if (err) {
                                    console.log("Error in Updating History" + err);
                                    return;
                                  } else {
                                    console.log("History Updated: ", updateHistory);
                                    return;
                                  }
                                }
                              );
                            }
                          }
                        )

                      } catch (e) {
                        console.log("error in history api", e);

                        return;
                      }
                      console.log("after history", dataHash)


                      let updateData = { hashStatus: 1 };
                      console.log("start");
                      await Order.findByIdAndUpdate(
                        orderID,
                        updateData,
                        async (err, resData) => {
                          console.log("resData", resData);
                          if (resData) {
                            console.log("Updated Order record", orderID);
                          }
                        }
                      ).catch((e) => {
                        return;
                      });
                    }
                  }
                );
              }
            }
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
}

setInterval(() => {
  // //  checkCollection();
  // checkNFTs();
  // checkOrders();
  // checkOffers();
  // checkBids()
}, 15000);
