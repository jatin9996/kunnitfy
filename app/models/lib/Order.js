const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  oSellerWalletAddress: String, //walletADDRESS OF Seller
  oTokenId: Number, //TokenID
  oTokenAddress: String, // Collection contract address
  oQuantity: Number,
  oType: {
    type: Number,
    //0 - Buy Now
    //1 - Auction/Offer
    //2 - Floor price Bid
    //3 - Bundle Buy Now
    //4 - Bundle Auction Offer
    enum: [0, 1, 2, 3, 4],
  },
  oPaymentToken: String, //the payment token address ERC20
  oPrice: mongoose.Types.Decimal128,
  oValidUpto: Number,
  oBundleTokens: Array,
  oBundleTokensQuantities: Array,
  oSalt: Number,
  oNftId: {
    type: mongoose.Schema.ObjectId,
    ref: "NFT",
  },
  oCreated: {
    type: Date,
    default: Date.now,
  },
  oSeller: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  oSignature: Array,
  auction_end_date: { type: Date },
  oStatus: {
    type: Number,
    default: 1,
    //0 - inactive
    //1 - active
    //2 - completed
    //3 - cancelled
    enum: [0, 1, 2, 3],
  },
  quantity_sold: { type: Number, default: 0 },
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

module.exports = mongoose.model("Order", orderSchema);
