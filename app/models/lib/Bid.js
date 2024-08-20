const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  oBidder: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  oOwner: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  oBidStatus: {
    type: String,
    enum: ["Bid", "Cancelled", "Accepted", "Sold", "Rejected", "MakeOffer"],
  },
  oBidPrice: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  oNFTId: {
    type: mongoose.Schema.ObjectId,
    ref: "NFT",
  },
  oOrderId: {
    type: mongoose.Schema.ObjectId,
    ref: "Order",
  },
  sCreated: {
    type: Date,
    default: Date.now,
  },
  isOffer: {
    type: Boolean,
    default: false,
  },
  salt: {
    type: Number
  },
  tokenId: {
    type: Number
  },
  tokenAddress: {
    type: String
  },
  paymentToken: {
    type: String
  },
  oBidDeadline: Number,
  oBidQuantity: Number,
  oBuyerSignature: Array,
  
  hashStatus: {
    //0 - Inactive & 1 - Active & 2 - Failed/Cancel
    type: Number,
    enum: [0, 1, 2],
    default: 0,
  },
  hash: {
    type: String,
    require: true
  },
});

module.exports = mongoose.model("Bid", bidSchema);
