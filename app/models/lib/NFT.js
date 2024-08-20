const mongoose = require("mongoose");

const nftSchema = mongoose.Schema({
  nHash: {
    type: String,
    require: true,
  },

  nCreated: {
    type: Date,
    default: Date.now,
  },
  nCreater: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    require: true,
  },
  nOrders: [{ type: mongoose.Schema.ObjectId, ref: "Order" }],
  nCollection: String,
  nTitle: String,
  nCollaborator: Array,
  nDescription: String,
  nCollaboratorPercentage: Array,
  nRoyaltyPercentage: Number,
  nQuantity: Number,
  nView: Number,
  nNftImageType: String,
  isBlocked: {
    type: Boolean,
    default: false,
    require: true

  },
  nNftImage: { type: String, require: true },
  nType: {
    type: Number,
    require: true,
    //1 - ERC721
    //2 - ERC1155
    enum: [1, 2],
  },
  nTokenID: {
    type: Number,
    require: true,
  },
  nUser_likes: [
    {
      type: mongoose.Schema.ObjectId,
    },
  ],
  nOwnedBy: [
    {
      address: {
        type: String,
        lowercase: true,
      },
      name: {
        type: String,
        lowercase: true,
      },
      quantity: {
        type: Number,
      },
      lazyMinted: {
        type: Boolean,
        default: false
      }
    },
  ],
  nLockedContent: {
    type: String,
  },
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
  nLazyMintingStatus: {
    type: Number,
    default: 0,

    //  0: Not lazy minting
    //  1: lazy minting
    //  2: isMinted
    enum: [0, 1, 2],
  }
});

module.exports = mongoose.model("NFT", nftSchema);
