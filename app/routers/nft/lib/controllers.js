/* eslint-disable no-undef */

const fs = require("fs");
const os = require("os");
const http = require("https");
const {
  NFT,
  Collection,
  User,
  Bid,
  NFTowners,
  Order,
  Banner,
} = require("../../../models");
const pinataSDK = require("@pinata/sdk");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const pinata = pinataSDK(
  process.env.PINATAAPIKEY,
  process.env.PINATASECRETAPIKEY
);
const mongoose = require("mongoose");
const validators = require("./validators");
var jwt = require("jsonwebtoken");
const e = require("express");
const exif = require("exif").ExifImage;
const controllers = {};

const path = require("path");
const randomstring = require("randomstring");

// Set S3 endpoint to DigitalOcean Spaces
const spacesEndpoint = new aws.Endpoint(process.env.BUCKET_ENDPOINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.BUCKET_NAME,
  acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (request, file, cb) {
    const ext = path.extname(file.originalname);
    const fileString = randomstring.generate(10);
    cb(null, Date.now().toString() + "-" + fileString + ext);
  },
  beforeTransform: function (req, file, cb) {
    try {
      new exif({ image: file.buffer }, function (error, data) {
        if (error) {
          console.log("Error extracting Exif data:", error);
        } else {
          file.buffer = Buffer.from(data.remove().buffer);
        }
        cb(null, file);
      });
    } catch (error) {
      console.log("Error extracting Exif data:", error);
      cb(null, file);
    }
  },
});
const Web3 = require("web3");
const ERC1155ABI = require("../../../../abis/extendedERC1155.json");
const ERC721ABI = require("../../../../abis/extendedERC721.json");
var web3 = new Web3(process.env.NETWORK_RPC_URL);

var allowedMimes;
var errAllowed;

let fileFilter = function (req, file, cb) {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      {
        success: false,
        message: `Invalid file type! Only ${errAllowed}  files are allowed.`,
      },
      false
    );
  }
};

let oMulterObj = {
  storage: storage,
  limits: {
    fileSize: 55 * 1024 * 1024, // 50mb
  },
  fileFilter: fileFilter,
};

const upload = multer(oMulterObj).single("nftFile");

controllers.create = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    allowedMimes = [
      "image/jpeg",
      "video/mp4",
      "image/jpg",
      "image/png",
      "image/gif",
      "audio/mp3",
      "audio/mpeg",
      "image/webp",
    ];
    errAllowed = "JPG, JPEG, PNG, GIF, WEBP, MP3, MP4 & MPEG";
    let metaData = req.body.metaData;
    upload(req, res, function (error) {
      if (error) {
        //instanceof multer.MulterError
        log.red(error);
        // fs.unlinkSync(req.file.path);
        return res.reply(messages.bad_request(error.message));
      } else {
        //log.green("Request Body",req.body);
        //log.green("Request Files",req.file);
        //console.log("Create Address","Checking");
        if (!req.body.nCreatorAddress) {
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.not_found("Creator Wallet Address"));
        }
        if (!req.body.nTitle) {
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.not_found("Title"));
        }
        if (!req.body.nQuantity) {
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.not_found("Quantity"));
        }
        // if (!req.body.nRoyaltyPercentage) {
        //   // fs.unlinkSync(req.file.path);
        //   return res.reply(messages.not_found("Royalty Percentages"));
        // }

        if (!validators.isValidString(req.body.nTitle)) {
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Title"));
        }
        if (req.body.nDescription.trim().length > 1000) {
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Description"));
        }
        if (isNaN(req.body.nQuantity) || !req.body.nQuantity > 0) {
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Quantity"));
        }
        if (isNaN(req.body.nRoyaltyPercentage)) {
          log.red("NaN");
          return res.reply(messages.invalid("Royalty Percentages"));
        }
        if (req.body.nRoyaltyPercentage < 0) {
          log.red("Greater Than 0");
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Royalty Percentages"));
        }
        if (!(req.body.nRoyaltyPercentage <= 10000)) {
          log.red("Less Than 100");
          // fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Royalty Percentages"));
        }
        // console.log("file", req);
        if (!req.file) {
          return res.reply(messages.not_found("File"));
        }

        // Check for duplicate Collaborator address
        if (
          new Set(req.body.nCollaborator.split(",")).size !==
          req.body.nCollaborator.split(",").length
        ) {
          return res.reply(
            messages.bad_request(
              "You Can't select same collaborator multiple times"
            )
          );
        }

        const iOptions = {
          pinataMetadata: {
            name: req.file.originalname,
          },
          pinataOptions: {
            cidVersion: 0,
          },
        };

        // let testFile = fs.readFileSync(req.file.path);
        // //Creating buffer for ipfs function to add file to the system
        // let testBuffer = Buffer.from(testFile);

        try {
          // const pathString = "/tmp/";
          const tempDir = os.tmpdir();
          const filePath = path.join(tempDir, req.file.originalname);
          //console.log("Files Data", req.file)
          const file = fs.createWriteStream(filePath);
          //console.log("file in create is-------->",file)

          let fileUrl = req.file.location;
          fileUrl = fileUrl.replace("http://", "https://");
          var prefix = "https://";
          if (fileUrl.substr(0, prefix.length) !== prefix) {
            fileUrl = prefix + fileUrl;
          }

          const request = http.get(`${fileUrl}`, function (response) {
            var stream = response.pipe(file);
            //console.log("strema is------>",stream)
            const readableStreamForFile = fs.createReadStream(
              filePath
            );

            stream.on("finish", async function () {
              pinata
                .pinFileToIPFS(readableStreamForFile, iOptions)
                .then((res) => {
                  console.log("metaa", metaData, JSON.parse(req.body.metaData));
                  metaData = JSON.parse(req.body.metaData);
                  console.log(
                    "req.body.nDescription is----->",
                    req.body.nDescription
                  );
                  let uploadingData = {};
                  uploadingData = {
                    description: req.body.nDescription,
                    external_url: "", // This is the URL that will appear below the asset's image on OpenSea and will allow users to leave OpenSea and view the item on your site.
                    image: "https://ipfs.io/ipfs/" + res.IpfsHash,
                    name: req.body.nTitle,
                    attributes: metaData,
                  };

                  const mOptions = {
                    pinataMetadata: {
                      name: "hello",
                    },
                    pinataOptions: {
                      cidVersion: 0,
                    },
                  };
                  //console.log("res---", res.IpfsHash);
                  return pinata.pinJSONToIPFS(uploadingData, mOptions);
                })
                .then(async (file2) => {
                  let newFileURl = req.file.location;
                  //if (req.body.nNftImageType === "mp4") {

                  newFileURl = newFileURl.replace("http://", "https://");
                  var prefix = "https://";
                  if (newFileURl.substr(0, prefix.length) !== prefix) {
                    newFileURl = prefix + newFileURl;
                  }

                  //}

                  //console.log("nwe file url is---->",newFileURl)

                  //console.log("file2---", file2);
                  //console.log("file location", "https://" + req.file.location);
                  const contractAddress = req.body.nCollection;
                  const creatorAddress = req.body.nCreatorAddress;
                  let user = await User.findById(req.userId);
                  //console.log("user is-->",user)
                  const nft = new NFT({
                    nTitle: req.body.nTitle,
                    nCollection:
                      req.body.nCollection && req.body.nCollection != undefined
                        ? req.body.nCollection
                        : "",
                    nHash: file2.IpfsHash,
                    nOwnedBy: [], //setting ownedby for first time empty
                    nQuantity: req.body.nQuantity,
                    nCollaborator: req.body.nCollaborator.split(","),
                    nCollaboratorPercentage: req.body.nCollaboratorPercentage
                      .split(",")
                      .map((percentage) => +percentage),
                    nRoyaltyPercentage: req.body.nRoyaltyPercentage,
                    nDescription: req.body.nDescription,
                    nCreater: req.userId,
                    nTokenID: req.body.nTokenID,
                    nType: req.body.nType,
                    nLockedContent: req.body.lockedContent,
                    nNftImage: newFileURl,
                    nLazyMintingStatus: req.body.nLazyMintingStatus,
                    nNftImageType: req.body.nNftImageType,
                    isBlocked: false,
                    hash: req.body.hash,
                    hashStatus: req.body.hashStatus,
                  });

                  //convert wallet address to lowercase- removing the nCurrentOwners temporarily
                  //nft.nCurrentOwners.set(creatorAddress.toLowerCase(), req.body.nQuantity);

                  nft.nOwnedBy.push({
                    address: creatorAddress.toLowerCase(),
                    quantity: req.body.nQuantity,
                    name: user.sUserName,
                    lazyMinted: req.body.nLazyMintingStatus,
                  });

                  nft
                    .save()
                    .then(async (result) => {
                      //increment collection nextId by 1
                      //update the collection and increment the nextId

                      const collection = await Collection.findOne({
                        sContractAddress: contractAddress,
                      });
                      let nextId = collection.getNextId();
                      collection.nextId = nextId;
                      collection.save();

                      return res.reply(messages.created("NFT"), result);
                    })
                    .catch((error) => {
                      console.log("Created NFT error", error);
                      return res.reply(messages.error());
                    });
                })

                .catch((e) => {
                  // fs.unlinkSync(req.file.path);
                  return res.reply(messages.error());
                });
            });
          });
        } catch (e) {
          console.log("error in file upload..", e);
        }
      }
    });
  } catch (error) {
    return res.reply(messages.error());
  }
};

controllers.getNftOwner = async (req, res) => {
  try {
    // if (!req.userId) return res.reply(messages.unauthorized());
    // if (!req.params.nNFTId) return res.reply(messages.not_found("NFT ID"));
    //console.log("user id && NFTId -->",req.userId,req.params.nNFTId);

    let nftOwner = {};

    nftOwner = await NFTowners.findOne({
      nftId: req.params.nNFTId,
      oCurrentOwner: req.userId,
    });
    if (!nftOwner) {
      nftOwner = await NFTowners.findOne(
        { nftId: req.params.nNFTId },
        {},
        { sort: { sCreated: -1 } }
      );
      //console.log("nft owner is-->",nftOwner);
      return res.reply(messages.success(), nftOwner);
    } else {
      if (nftOwner.oCurrentOwner) {
        users = await User.findOne(nftOwner.oCurrentOwner);
        nftOwner.oCurrentOwner = users;
      }
      //console.log("nft owner is-->",nftOwner);
      return res.reply(messages.success(), nftOwner);
    }
  } catch (e) {
    console.log("error in getNftOwner is-->", e);
    return e;
  }
};

controllers.getAllnftOwner = async (req, res) => {
  try {
    //console.log("All Nft Called -->",req.params.nNFTId);

    let nftOwner = {};

    nftOwner = await NFTowners.find({ nftId: req.params.nNFTId });
    return res.reply(messages.success(), nftOwner);
  } catch (e) {
    console.log("error in getNftOwner is-->", e);
    return e;
  }
};

controllers.mynftlist = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    var nLimit = parseInt(req.body.length);
    var nOffset = parseInt(req.body.start);
    let oTypeQuery = {},
      oSellingTypeQuery = {},
      oSortingOrder = {};
    log.red(req.body);
    if (req.body.eType[0] != "All" && req.body.eType[0] != "") {
      oTypeQuery = {
        $or: [],
      };
      req.body.eType.forEach((element) => {
        oTypeQuery["$or"].push({
          eType: element,
        });
      });
    }

    let oCollectionQuery = {};
    if (req.body.sCollection != "All" && req.body.sCollection != "") {
      oCollectionQuery = {
        sCollection: req.body.sCollection,
      };
    }

    if (req.body.sSellingType != "") {
      oSellingTypeQuery = {
        eAuctionType: req.body.sSellingType,
      };
    }

    if (req.body.sSortingType == "Recently Added") {
      oSortingOrder["sCreated"] = -1;
    } else if (req.body.sSortingType == "Most Viewed") {
      oSortingOrder["nView"] = -1;
    } else if (req.body.sSortingType == "Price Low to High") {
      oSortingOrder["nBasePrice"] = 1;
    } else if (req.body.sSortingType == "Price High to Low") {
      oSortingOrder["nBasePrice"] = -1;
    } else {
      oSortingOrder["_id"] = -1;
    }

    let data = await NFT.aggregate([
      {
        $match: {
          $and: [
            oTypeQuery,
            oCollectionQuery,
            oSellingTypeQuery,
            {
              $or: [
                {
                  oCurrentOwner: mongoose.Types.ObjectId(req.userId),
                },
              ],
            },
          ],
        },
      },
      {
        $sort: oSortingOrder,
      },
      {
        $project: {
          _id: 1,
          sName: 1,
          eType: 1,
          nBasePrice: 1,
          collectionImage: 1,
          nQuantity: 1,
          nTokenID: 1,
          oCurrentOwner: 1,
          sTransactionStatus: 1,
          eAuctionType: 1,

          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          isBlocked: 1,

          user_likes: {
            $size: {
              $filter: {
                input: "$user_likes",
                as: "user_likes",
                cond: {
                  $eq: ["$$user_likes", mongoose.Types.ObjectId(req.userId)],
                },
              },
            },
          },
          user_likes_size: {
            $cond: {
              if: {
                $isArray: "$user_likes",
              },
              then: {
                $size: "$user_likes",
              },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          sName: 1,
          eType: 1,
          nBasePrice: 1,
          collectionImage: 1,
          nQuantity: 1,
          nTokenID: 1,
          oCurrentOwner: 1,
          sTransactionStatus: 1,
          eAuctionType: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          isBlocked: 1,

          is_user_like: {
            $cond: {
              if: {
                $gte: ["$user_likes", 1],
              },
              then: "true",
              else: "false",
            },
          },
          user_likes_size: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oCurrentOwner",
          foreignField: "_id",
          as: "oUser",
        },
      },
      { $unwind: "$oUser" },
      {
        $facet: {
          nfts: [
            {
              $skip: +nOffset,
            },
            {
              $limit: +nLimit,
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
    let iFiltered = data[0].nfts.length;
    if (data[0].totalCount[0] == undefined) {
      return res.reply(messages.success("Data"), {
        data: 0,
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: iFiltered,
      });
    } else {
      return res.reply(messages.no_prefix("NFT Details"), {
        data: data[0].nfts,
        draw: req.body.draw,
        recordsTotal: data[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.createCollection = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    errAllowed = "JPG, JPEG, WEBP, PNG,  GIF";

    upload(req, res, function (error) {
      if (error) {
        console.log("error is---->", error);
        fs.unlinkSync(req.file.path);
        return res.reply(messages.bad_request(error.message));
      } else {
        if (!req.body.sName) {
          fs.unlinkSync(req.file.path);

          return res.reply(messages.not_found("Collection Name"));
        }
        if (!req.file) {
          fs.unlinkSync(req.file.path);
          return res.reply(messages.not_found("File"));
        }

        if (!req.body.sRoyaltyPercentage) {
          fs.unlinkSync(req.file.path);
          return res.reply(messages.not_found("Royalty Percentages"));
        }

        if (isNaN(req.body.sRoyaltyPercentage)) {
          log.red("NaN");
          fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Royalty Percentages"));
        }
        if (req.body.sRoyaltyPercentage < 0) {
          log.red("Greater Than 0");
          fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Royalty Percentages"));
        }
        if (!(req.body.sRoyaltyPercentage <= 10000)) {
          log.red("Less Than 100");
          fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Royalty Percentages"));
        }

        if (!validators.isValidString(req.body.sName)) {
          fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Collection Name"));
        }
        if (req.body.sDescription.trim().length > 1000) {
          fs.unlinkSync(req.file.path);
          return res.reply(messages.invalid("Description"));
        }

        const oOptions = {
          pinataMetadata: {
            name: req.file.originalname,
          },
          pinataOptions: {
            cidVersion: 0,
          },
        };

        try {
          // const pathString = "/tmp/";
          const tempDir = os.tmpdir();
          const filePath = path.join(tempDir, req.file.originalname);
          const file = fs.createWriteStream(filePath);
          // console.log("fileeee",file)
          let fileLocation = req.file.location;
          fileLocation = fileLocation.replace("http://", "https://");
          var prefix = "https://";
          if (fileLocation.substr(0, prefix.length) !== prefix) {
            fileLocation = prefix + fileLocation;
          }
          console.log("File Location in collection is----->", fileLocation);
          try {
            const request = http.get(`${fileLocation}`, function (response) {
              console.log("here");
              var stream = response.pipe(file);
              const filePath = path.join(tempDir, req.file.originalname);
              const readableStreamForFile = fs.createReadStream(
                filePath
              );
              console.log("herer for testing");

              stream.on("finish", async function () {
                pinata
                  .pinFileToIPFS(readableStreamForFile, oOptions)
                  .then(async (file2) => {
                    console.log("here--->", file2.IpfsHash);
                    console.log("here-price-->", req.body.sFloorprice);
                    const collection = new Collection({
                      sHash: file2.IpfsHash,
                      sName: req.body.sName,
                      sDescription: req.body.sDescription,
                      sFloorPrice: Number(req.body.sFloorprice),
                      erc721: req.body.erc721,
                      sContractAddress: req.body.sContractAddress,
                      sRoyaltyPercentage: req.body.sRoyaltyPercentage,
                      oCreatedBy: req.userId,
                      nextId: 0,
                      collectionImage: fileLocation,
                    });
                    collection
                      .save()
                      .then((result) => {
                        return res.reply(
                          messages.created("Collection"),
                          result
                        );
                      })
                      .catch((error) => {
                        return res.reply(
                          messages.already_exists("Collection"),
                          error
                        );
                      });
                  })
                  .catch((e) => {
                    console.log("error in create collection is", e);
                    return res.reply(messages.error());
                  });
              });
            });
          } catch (e) {
            console.log("error in here is", e);
          }
        } catch (e) {
          console.log("error in file upload..", e);
        }
      }
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getcollections = async (req, res) => {
  try {
    let aCollections = await Collection.find({});
    //console.log("Collections is----659",aCollections);

    if (!aCollections) {
      return res.reply(messages.not_found("collection"));
    }
    return res.reply(messages.no_prefix("Collections List"), aCollections);
  } catch (e) {
    return res.reply(messages.error(e));
  }
};

controllers.getHotCollections = async (req, res) => {
  try {
    console.log("in get hot collection");
    let data = [];
    let setConditions = {};
    let sTextsearch = req.body.sTextsearch;
    const erc721 = req.body.erc721;

    if (req.body.conditions) {
      setConditions = req.body.conditions;
    }

    //sortKey is the column
    const sortKey = req.body.sortKey ? req.body.sortKey : "";

    //sortType will let you choose from ASC 1 or DESC -1
    const sortType = req.body.sortType ? req.body.sortType : -1;

    var sortObject = {};
    var stype = sortKey;
    var sdir = sortType;
    sortObject[stype] = sdir;
    console.log("here again");
    let CollectionSearchArray = [];
    if (sTextsearch !== "") {
      CollectionSearchArray["sName"] = {
        $regex: new RegExp(sTextsearch),
        // $options: "<options>",
      };
    }

    console.log("here againa one more time");

    if (erc721 !== "" && erc721) {
      CollectionSearchArray["erc721"] = true;
    }
    if (erc721 !== "" && erc721 === false) {
      CollectionSearchArray["erc721"] = false;
    }
    //CollectionSearchArray["oNFTs.0"] = { $exists: true }
    let CollectionSearchObj = Object.assign({}, CollectionSearchArray);

    const page = parseInt(req.body.page);
    const limit = parseInt(req.body.limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    if (
      endIndex < (await Collection.countDocuments(CollectionSearchObj).exec())
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

    let aCollections = await Collection.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "oCreatedBy",
          foreignField: "_id",
          as: "oUser",
        },
        //$lookup: {
        //  from: "nft",
        //  localField: "sContractAddress",
        //  foreignField: "nCollection",
        //  as: "oNFTs",
        //},
      },
      //{

      //  $lookup: {
      //    from: "nfts",
      //    localField: "sContractAddress",
      //    foreignField: "nCollection",
      //    as: "oNFTs",
      //  },
      //},
      {
        $sort: {
          sCreated: req.body.sortType,
        },
      },
      { $match: CollectionSearchObj },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ]);

    results.results = aCollections;
    results.count = await Collection.countDocuments(CollectionSearchObj).exec();
    //console.log("Collections",data);
    res.header("Access-Control-Max-Age", 600);
    return res.reply(messages.no_prefix("Collections List"), results);
  } catch (e) {
    return res.reply(messages.error(e));
  }
};
controllers.getAllCollections = async (req, res) => {
  try {
    let data = [];
    let setConditions = {};
    let sTextsearch = req.body.sTextsearch;
    const erc721 = req.body.erc721;

    if (req.body.conditions) {
      setConditions = req.body.conditions;
    }

    //sortKey is the column
    const sortKey = req.body.sortKey ? req.body.sortKey : "";

    //sortType will let you choose from ASC 1 or DESC -1
    const sortType = req.body.sortType ? req.body.sortType : -1;

    var sortObject = {};
    var stype = sortKey;
    var sdir = sortType;
    sortObject[stype] = sdir;

    let CollectionSearchArray = [];
    if (sTextsearch !== "") {
      CollectionSearchArray["sName"] = {
        $regex: new RegExp(sTextsearch),
        $options: "<options>",
      };
    }

    if (erc721 !== "" && erc721) {
      CollectionSearchArray["erc721"] = true;
    }
    if (erc721 !== "" && erc721 === false) {
      CollectionSearchArray["erc721"] = false;
    }
    //CollectionSearchArray["oNFTs.0"] = { $exists: true }
    let CollectionSearchObj = Object.assign({}, CollectionSearchArray);

    const page = parseInt(req.body.page);
    const limit = parseInt(req.body.limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    if (
      endIndex < (await Collection.countDocuments(CollectionSearchObj).exec())
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

    let aCollections = await Collection.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "oCreatedBy",
          foreignField: "_id",
          as: "oUser",
        },
      },

      {
        $sort: {
          sCreated: req.body.sortType,
        },
      },
      { $match: CollectionSearchObj },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ]);

    results.results = aCollections;
    results.count = await Collection.countDocuments(CollectionSearchObj).exec();
    //console.log("Collections",data);
    res.header("Access-Control-Max-Age", 600);
    return res.reply(messages.no_prefix("Collections List"), results);
  } catch (e) {
    return res.reply(messages.error(e));
  }
};

controllers.collectionlist = async (req, res) => {
  try {
    // if (!req.userId) return res.reply(messages.unauthorized());
    //console.log("request in coll",req.body);

    const page = parseInt(req.body.page);
    const limit = parseInt(req.body.limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};
    if (
      endIndex <
      (await Collection.countDocuments({
        oCreatedBy: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
      }).exec())
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
    let aCollections = await Collection.aggregate([
      {
        $match: {
          oCreatedBy: mongoose.Types.ObjectId(req.body.userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oCreatedBy",
          foreignField: "_id",
          as: "oUser",
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $sort: {
          sCreated: -1,
        },
      },
    ]);
    //console.log("aCollections",aCollections);
    if (!aCollections) {
      return res.reply(messages.not_found("collection"));
    }
    results.results = aCollections;
    results.count = await Collection.countDocuments({
      oCreatedBy: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
    }).exec();
    return res.reply(messages.no_prefix("Collection Details"), results);
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.collectionlistMy = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    var nLimit = parseInt(req.body.length);
    var nOffset = parseInt(req.body.start);

    let query = {
      oCreatedBy: mongoose.Types.ObjectId(req.userId),
    };
    if (req && req.body.sTextsearch && req.body.sTextsearch != undefined) {
      query["sName"] = new RegExp(req.body.sTextsearch, "i");
    }

    let aCollections = await Collection.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "users",
          localField: "oCreatedBy",
          foreignField: "_id",
          as: "oUser",
        },
      },
      {
        $unwind: { preserveNullAndEmptyArrays: true, path: "$oUser" },
      },
      {
        $sort: {
          sCreated: -1,
        },
      },
      {
        $facet: {
          collections: [
            {
              $skip: +nOffset,
            },
            {
              $limit: +nLimit,
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

    let iFiltered = aCollections[0].collections.length;
    if (aCollections[0].totalCount[0] == undefined) {
      return res.reply(messages.success("Data"), {
        aCollections: 0,
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: iFiltered,
      });
    } else {
      return res.reply(messages.no_prefix("Collection Details"), {
        data: aCollections[0].collections,
        draw: req.body.draw,
        recordsTotal: aCollections[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.nftListing = async (req, res) => {
  try {
    var nLimit = parseInt(req.body.length);
    var nOffset = parseInt(req.body.start);
    let sBPMQuery = {};
    let sGenreQuery = {};
    let oTypeQuery = {},
      oSellingTypeQuery = {},
      oSortingOrder = {};
    let oTtextQuery = {
      sName: new RegExp(req.body.sTextsearch, "i"),
    };
    if (req.body.eType[0] != "All" && req.body.eType[0] != "") {
      oTypeQuery = {
        $or: [],
      };
      req.body.eType.forEach((element) => {
        oTypeQuery["$or"].push({
          eType: element,
        });
      });
    }
    if (
      req.body.sFrom &&
      req.body.sFrom != undefined &&
      req.body.sFrom != "" &&
      req.body.sTo &&
      req.body.sTo != undefined &&
      req.body.sTo != ""
    ) {
      sBPMQuery = {
        sBpm: { $gte: parseInt(req.body.sFrom), $lte: parseInt(req.body.sTo) },
      };
    }

    if (req.body.sSortingType == "Recently Added") {
      oSortingOrder["sCreated"] = -1;
    } else if (req.body.sSortingType == "Most Viewed") {
      oSortingOrder["nView"] = -1;
    } else if (req.body.sSortingType == "Price Low to High") {
      oSortingOrder["nBasePrice"] = 1;
    } else if (req.body.sSortingType == "Price High to Low") {
      oSortingOrder["nBasePrice"] = -1;
    } else {
      oSortingOrder["_id"] = -1;
    }

    if (
      req.body.sGenre &&
      req.body.sGenre != undefined &&
      req.body.sGenre.length
    ) {
      sGenreQuery = {
        sGenre: { $in: req.body.sGenre },
      };
    }

    if (req.body.sSellingType != "") {
      oSellingTypeQuery = {
        $or: [
          {
            eAuctionType: req.body.sSellingType,
          },
        ],
      };
    }

    let data = await NFT.aggregate([
      {
        $match: {
          $and: [
            {
              sTransactionStatus: {
                $eq: 1,
              },
            },
            {
              eAuctionType: {
                $ne: "Unlockable",
              },
            },
            oTypeQuery,
            oTtextQuery,
            oSellingTypeQuery,
            sBPMQuery,
            sGenreQuery,
          ],
        },
      },
      {
        $sort: oSortingOrder,
      },
      {
        $project: {
          _id: 1,
          sName: 1,
          eType: 1,
          nBasePrice: 1,
          collectionImage: 1,
          oCurrentOwner: 1,
          eAuctionType: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          user_likes: {
            $size: {
              $filter: {
                input: "$user_likes",
                as: "user_likes",
                cond: {
                  $eq: [
                    "$$user_likes",
                    req.userId && req.userId != undefined && req.userId != null
                      ? req.userId
                      : "",
                  ],
                },
              },
            },
          },
          user_likes_size: {
            $cond: {
              if: {
                $isArray: "$user_likes",
              },
              then: {
                $size: "$user_likes",
              },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          sName: 1,
          eType: 1,
          nBasePrice: 1,
          collectionImage: 1,
          oCurrentOwner: 1,
          eAuctionType: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          "oUser._id": 1,
          "oUser.sUserName": 1,
          "oUser.sWalletAddress": 1,
          "oUser.oName": 1,
          "oUser.sProfilePicUrl": 1,
          is_user_like: {
            $cond: {
              if: {
                $gte: ["$user_likes", 1],
              },
              then: "true",
              else: "false",
            },
          },
          user_likes_size: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oCurrentOwner",
          foreignField: "_id",
          as: "oUser",
        },
      },
      { $unwind: "$oUser" },
      {
        $facet: {
          nfts: [
            {
              $skip: +nOffset,
            },
            {
              $limit: +nLimit,
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
    let iFiltered = data[0].nfts.length;
    if (data[0].totalCount[0] == undefined) {
      return res.reply(messages.success("Data"), {
        data: 0,
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: iFiltered,
      });
    } else {
      return res.reply(messages.no_prefix("NFT Details"), {
        data: data[0].nfts,
        draw: req.body.draw,
        recordsTotal: data[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.nftID = async (req, res) => {
  console.log("View NFT Called");
  try {
    if (
      !req.params.nNFTId ||
      req.params.nNFTId === undefined ||
      req.params.nNFTId == undefined ||
      req.params.nNFTId == "undefined" ||
      req.params.nNFTId === ""
    ) {
      return res.reply(messages.not_found("NFT ID"));
    }
    console.log("View NFT Called");
    if (!validators.isValidObjectID(req.params.nNFTId))
      res.reply(messages.invalid("NFT ID"));
    let aNFT;
    try {
      aNFT = await NFT.findById(req.params.nNFTId).populate({
        path: "nCreater",

        options: {
          limit: 1,
        },

      },

      );
      if (!aNFT) return res.reply(messages.not_found("NFT"));
    } catch (e) {
      console.log("error in NFt find by ID", e);
    }

    aNFT = aNFT.toObject();
    aNFT.sCollectionDetail = {};
    console.log('nftttt', aNFT)
    // aNFT.sCollectionDetail = await Collection.findOne({
    //   sName:
    //     aNFT.sCollection && aNFT.sCollection != undefined
    //       ? aNFT.sCollection
    //       : "-",
    // });
    aNFT.sCollectionDetail = await Collection.findOne({ sContractAddress: aNFT.nCollection })
    console.log("aNFT.nCreater.sEmail", aNFT?.nCreater?.sEmail);

    var token = req.headers.authorization;

    req.userId =
      req.userId && req.userId != undefined && req.userId != null
        ? req.userId
        : "";

    let likeARY =
      aNFT.user_likes && aNFT.user_likes.length
        ? aNFT.user_likes.filter((v) => v.toString() == req.userId.toString())
        : [];

    // if (likeARY && likeARY.length) {
    //   aNFT.is_user_like = "true";
    // } else {
    //   aNFT.is_user_like = "false";
    // }

    //
    if (token) {
      token = token.replace("Bearer ", "");
      jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
        if (decoded) req.userId = decoded.id;
      });

      if (aNFT.oCurrentOwner._id != req.userId)
        await NFT.findByIdAndUpdate(req.params.nNFTId, {
          $inc: {
            nView: 1,
          },
        });
    }
    aNFT.loggedinUserId = req.userId;
    //console.log("---------------------------8");

    if (!aNFT) {
      //console.log("---------------------------9");
      return res.reply(messages.not_found("NFT"));
    } else {
      //console.log("---------------------------10");
      if (aNFT.nLockedContent) {
        aNFT.nLockedContent = 1;
      }
      if (aNFT.nCreater.sEmail) {
        delete aNFT.nCreater.sEmail;
      }
      return res.reply(messages.success(), aNFT);
    }
  } catch (error) {
    //console.log("Error in 1172",error)
    return res.reply(messages.server_error());
  }
};

controllers.deleteNFT = async (req, res) => {
  try {
    if (!req.params.nNFTId) return res.reply(messages.not_found("NFT ID"));

    if (!validators.isValidObjectID(req.params.nNFTId))
      res.reply(messages.invalid("NFT ID"));

    await NFT.findByIdAndDelete(req.params.nNFTId);
    return res.reply(messages.success("NFT deleted"));
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getCollectionDetails = (req, res) => {
  try {
    Collection.findOne({ _id: req.body.collectionId }, (err, collection) => {
      if (err) return res.reply(messages.server_error());
      if (!collection) return res.reply(messages.not_found("Collection"));
      return res.reply(messages.no_prefix("Collection Details"), collection);
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.updateCollectionVoulme=  async(req,res)=>{
  const {id,price} = req.body
  try {
    let collection= await Collection.updateOne({sContractAddress:id},{$inc:{volume:price}})
     return res.reply(messages.no_prefix("Volume updated."), collection);
  } catch (error) {
    console.log(error)
    return res.reply(messages.server_error());
  }
}

controllers.getCollectionDetailsByAddress = (req, res) => {
  try {
    Collection.findOne(
      { sContractAddress: req.body.sContractAddress },
      (err, collection) => {
        if (err) return res.reply(messages.server_error());
        if (!collection) return res.reply(messages.not_found("Collection"));
        return res.reply(messages.no_prefix("Collection Details"), collection);
      }
    );
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getMetaDataOfCollection = async (req, res) => {
  try {
    console.log(req.body.collectionId)
    const nfts = await NFT.find({ nCollection: req.body.collectionId }).populate('nOrders')
    nfts.sort((a, b) => a.nOrders[0]?.oPrice - b.nOrders[0]?.oPrice)
    // const nfts = await NFT.aggregate([
    //   // Match NFTs belonging to the specified collection
    //   { $match: { nCollection: req.body.collectionId } },

    //   {
    //     $lookup: {
    //       from: "orders", // Assuming orders are stored in a separate collection named ordersCollection
    //       localField: "nOrders",   // Field in nftCollection
    //       foreignField: "_id",      // Field in ordersCollection
    //       as: "orders"
    //     }
    //   },
    //   {
    //     $addFields: {
    //       price: { $toDouble: "$orders.oPrice" } // Add a field to store the maximum oPrice within nOrders array
    //     }
    //   },
    //   {
    //     $sort: { "minPriceOrder": 1 } // Sort documents based on the maxPriceOrder field
    //   }

    //   // Limit to 1 document to get the minimum price
    //   // { $limit: 1 }
    // ]);
    console.log('nfts', nfts[0]);
    const floorPrice = nfts.length > 0 ? nfts[0].nOrders[0]?.oPrice.toString() : 0;
    const latestPrice = nfts.length > 0 ? nfts[nfts.length - 1].nOrders[0]?.oPrice.toString() : 0;
    

    const Price = await Collection.findOne({sContractAddress:req.body.collectionId})
    console.log(floorPrice);
    let metaData = {
      "floorPrice": floorPrice || 0,
      "items": nfts.length,
      "latestPrice": latestPrice,
      "volume":Price?.volume || 0,
    }
    return res.reply(messages.no_prefix("MetaData Details"), metaData);
  } catch (error) {
    console.log('Error getting metadata for collection', error);
    return res.reply(messages.server_error());
  }
}

controllers.setTransactionHash = async (req, res) => {
  try {
    if (!req.body.nNFTId) return res.reply(messages.not_found("NFT ID"));
    if (!req.body.sTransactionHash)
      return res.reply(messages.not_found("Transaction Hash"));

    if (!validators.isValidObjectID(req.body.nNFTId))
      res.reply(messages.invalid("NFT ID"));
    // if (req.body.nTokenID <= 0) res.reply(messages.invalid("Token ID"));
    if (!validators.isValidTransactionHash(req.body.sTransactionHash))
      res.reply(messages.invalid("Transaction Hash"));

    NFT.findByIdAndUpdate(
      req.body.nNFTId,
      {
        // nTokenID: req.body.nTokenID,
        sTransactionHash: req.body.sTransactionHash,
        sTransactionStatus: 0,
      },
      (err, nft) => {
        if (err) return res.reply(messages.server_error());
        if (!nft) return res.reply(messages.not_found("NFT"));

        return res.reply(messages.updated("NFT Details"));
      }
    );
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.landing = async (req, res) => {
  try {
    req.userId =
      req.userId && req.userId != undefined && req.userId != null
        ? req.userId
        : "";
    //console.log("---------------------2",req.userId);

    let data = await NFT.aggregate([
      {
        $facet: {
          recentlyAdded: [
            {
              $match: {
                sTransactionStatus: {
                  $eq: 1,
                },
                eAuctionType: {
                  $ne: "Unlockable",
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {
              $limit: 10,
            },
            {
              $lookup: {
                from: "users",
                localField: "oCurrentOwner",
                foreignField: "_id",
                as: "aCurrentOwner",
              },
            },
            { $unwind: "$aCurrentOwner" },
            {
              $project: {
                collectionImage: 1,
                eType: 1,
                sCreated: 1,
                oCurrentOwner: 1,
                oPostedBy: 1,
                sCollection: 1,
                sName: 1,
                sCollaborator: 1,
                sNftdescription: 1,
                nCollaboratorPercentage: 1,
                sSetRRoyaltyPercentage: 1,
                nQuantity: 1,
                nView: 1,
                nBasePrice: 1,
                eAuctionType: 1,
                nTokenID: 1,
                sTransactionHash: 1,
                sTransactionStatus: 1,
                aCurrentOwner: 1,
                sGenre: 1,
                sBpm: 1,
                skey_equalTo: 1,
                skey_harmonicTo: 1,
                track_cover: 1,
                user_likes: {
                  $size: {
                    $filter: {
                      input: "$user_likes",
                      as: "user_likes",
                      cond: {
                        $eq: [
                          "$$user_likes",
                          req.userId &&
                            req.userId != undefined &&
                            req.userId != null
                            ? mongoose.Types.ObjectId(req.userId)
                            : "",
                        ],
                      },
                    },
                  },
                },
                user_likes_size: {
                  $cond: {
                    if: {
                      $isArray: "$user_likes",
                    },
                    then: {
                      $size: "$user_likes",
                    },
                    else: 0,
                  },
                },
              },
            },
            {
              $project: {
                collectionImage: 1,
                eType: 1,
                sCreated: 1,
                oCurrentOwner: 1,
                oPostedBy: 1,
                sCollection: 1,
                sName: 1,
                sCollaborator: 1,
                sNftdescription: 1,
                nCollaboratorPercentage: 1,
                sSetRRoyaltyPercentage: 1,
                nQuantity: 1,
                nView: 1,
                nBasePrice: 1,
                eAuctionType: 1,
                nTokenID: 1,
                sGenre: 1,
                sBpm: 1,
                skey_equalTo: 1,
                skey_harmonicTo: 1,
                track_cover: 1,
                sTransactionHash: 1,
                sTransactionStatus: 1,
                aCurrentOwner: 1,
                is_user_like: {
                  $cond: {
                    if: {
                      $gte: ["$user_likes", 1],
                    },
                    then: "true",
                    else: "false",
                  },
                },
                user_likes_size: 1,
              },
            },
          ],
          onSale: [
            {
              $match: {
                sTransactionStatus: {
                  $eq: 1,
                },
                eAuctionType: {
                  $eq: "Fixed Sale",
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {
              $limit: 10,
            },
            {
              $lookup: {
                from: "users",
                localField: "oCurrentOwner",
                foreignField: "_id",
                as: "aCurrentOwner",
              },
            },
            { $unwind: "$aCurrentOwner" },
            {
              $project: {
                collectionImage: 1,
                eType: 1,
                sCreated: 1,
                oCurrentOwner: 1,
                oPostedBy: 1,
                sCollection: 1,
                sName: 1,
                sCollaborator: 1,
                sNftdescription: 1,
                nCollaboratorPercentage: 1,
                sSetRRoyaltyPercentage: 1,
                nQuantity: 1,
                nView: 1,
                nBasePrice: 1,
                eAuctionType: 1,
                sGenre: 1,
                sBpm: 1,
                skey_equalTo: 1,
                skey_harmonicTo: 1,
                track_cover: 1,
                nTokenID: 1,
                sTransactionHash: 1,
                sTransactionStatus: 1,
                aCurrentOwner: 1,
                user_likes: {
                  $size: {
                    $filter: {
                      input: "$user_likes",
                      as: "user_likes",
                      cond: {
                        $eq: [
                          "$$user_likes",
                          req.userId &&
                            req.userId != undefined &&
                            req.userId != null
                            ? mongoose.Types.ObjectId(req.userId)
                            : "",
                        ],
                      },
                    },
                  },
                },
                user_likes_size: {
                  $cond: {
                    if: {
                      $isArray: "$user_likes",
                    },
                    then: {
                      $size: "$user_likes",
                    },
                    else: 0,
                  },
                },
              },
            },
            {
              $project: {
                collectionImage: 1,
                eType: 1,
                sCreated: 1,
                oCurrentOwner: 1,
                oPostedBy: 1,
                sCollection: 1,
                sName: 1,
                sCollaborator: 1,
                sNftdescription: 1,
                nCollaboratorPercentage: 1,
                sSetRRoyaltyPercentage: 1,
                nQuantity: 1,
                sGenre: 1,
                sBpm: 1,
                skey_equalTo: 1,
                skey_harmonicTo: 1,
                track_cover: 1,
                nView: 1,
                nBasePrice: 1,
                eAuctionType: 1,
                nTokenID: 1,
                sTransactionHash: 1,
                sTransactionStatus: 1,
                aCurrentOwner: 1,
                is_user_like: {
                  $cond: {
                    if: {
                      $gte: ["$user_likes", 1],
                    },
                    then: "true",
                    else: "false",
                  },
                },
                user_likes_size: 1,
              },
            },
          ],
          onAuction: [
            {
              $match: {
                sTransactionStatus: {
                  $eq: 1,
                },
                eAuctionType: {
                  $eq: "Auction",
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {
              $limit: 10,
            },
            {
              $lookup: {
                from: "users",
                localField: "oCurrentOwner",
                foreignField: "_id",
                as: "aCurrentOwner",
              },
            },
            { $unwind: "$aCurrentOwner" },
            {
              $project: {
                collectionImage: 1,
                eType: 1,
                sCreated: 1,
                oCurrentOwner: 1,
                oPostedBy: 1,
                sCollection: 1,
                sName: 1,
                sCollaborator: 1,
                sNftdescription: 1,
                nCollaboratorPercentage: 1,
                sSetRRoyaltyPercentage: 1,
                nQuantity: 1,
                nView: 1,
                sGenre: 1,
                sBpm: 1,
                skey_equalTo: 1,
                skey_harmonicTo: 1,
                track_cover: 1,
                nBasePrice: 1,
                eAuctionType: 1,
                nTokenID: 1,
                sTransactionHash: 1,
                sTransactionStatus: 1,
                aCurrentOwner: 1,
                user_likes: {
                  $size: {
                    $filter: {
                      input: "$user_likes",
                      as: "user_likes",
                      cond: {
                        $eq: [
                          "$$user_likes",
                          req.userId &&
                            req.userId != undefined &&
                            req.userId != null
                            ? mongoose.Types.ObjectId(req.userId)
                            : "",
                        ],
                      },
                    },
                  },
                },
                user_likes_size: {
                  $cond: {
                    if: {
                      $isArray: "$user_likes",
                    },
                    then: {
                      $size: "$user_likes",
                    },
                    else: 0,
                  },
                },
              },
            },
            {
              $project: {
                collectionImage: 1,
                eType: 1,
                sCreated: 1,
                oCurrentOwner: 1,
                oPostedBy: 1,
                sCollection: 1,
                sName: 1,
                sCollaborator: 1,
                sNftdescription: 1,
                sGenre: 1,
                sBpm: 1,
                skey_equalTo: 1,
                skey_harmonicTo: 1,
                track_cover: 1,
                nCollaboratorPercentage: 1,
                sSetRRoyaltyPercentage: 1,
                nQuantity: 1,
                nView: 1,
                nBasePrice: 1,
                eAuctionType: 1,
                nTokenID: 1,
                sTransactionHash: 1,
                sTransactionStatus: 1,
                aCurrentOwner: 1,
                is_user_like: {
                  $cond: {
                    if: {
                      $gte: ["$user_likes", 1],
                    },
                    then: "true",
                    else: "false",
                  },
                },
                user_likes_size: 1,
              },
            },
          ],
        },
      },
    ]);
    //console.log("---------------------data",data);

    data[0].users = [];
    data[0].users = await User.find({ sRole: "user" });

    let agQuery = [
      {
        $lookup: {
          from: "users",
          localField: "oCreatedBy",
          foreignField: "_id",
          as: "oUser",
        },
      },
      {
        $sort: {
          sCreated: -1,
        },
      },
      { $unwind: "$oUser" },
    ];

    data[0].collections = [];
    data[0].collections = await Collection.aggregate(agQuery);
    return res.reply(messages.success(), data[0]);
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.toggleSellingType = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    if (!req.body.nNFTId) return res.reply(messages.not_found("NFT ID"));
    if (!req.body.sSellingType)
      return res.reply(messages.not_found("Selling Type"));

    if (!validators.isValidObjectID(req.body.nNFTId))
      return res.reply(messages.invalid("NFT ID"));
    if (!validators.isValidSellingType(req.body.sSellingType))
      return res.reply(messages.invalid("Selling Type"));

    let oNFT = await NFT.findById(req.body.nNFTId);

    if (!oNFT) return res.reply(messages.not_found("NFT"));
    if (oNFT.oCurrentOwner != req.userId)
      return res.reply(
        message.bad_request("Only NFT Owner Can Set Selling Type")
      );

    let BIdsExist = await Bid.find({
      oNFTId: mongoose.Types.ObjectId(req.body.nNFTId),
      sTransactionStatus: 1,
      eBidStatus: "Bid",
    });

    if (BIdsExist && BIdsExist != undefined && BIdsExist.length) {
      return res.reply(
        messages.bad_request("Please Cancel Active bids on this NFT.")
      );
    } else {
      let updObj = {
        eAuctionType: req.body.sSellingType,
      };

      if (req.body.auction_end_date && req.body.auction_end_date != undefined) {
        updObj.auction_end_date = req.body.auction_end_date;
      }
      NFT.findByIdAndUpdate(req.body.nNFTId, updObj, (err, nft) => {
        if (err) return res.reply(messages.server_error());
        if (!nft) return res.reply(messages.not_found("NFT"));

        return res.reply(messages.updated("NFT Details"));
      });
    }
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.allCollectionWiselist = async (req, res) => {
  try {
    var nLimit = parseInt(req.body.length);
    var nOffset = parseInt(req.body.start);
    let oTypeQuery = {},
      oSellingTypeQuery = {},
      oCollectionQuery = {},
      oSortingOrder = {};
    let oTtextQuery = {
      sName: new RegExp(req.body.sTextsearch, "i"),
    };
    if (req.body.eType[0] != "All" && req.body.eType[0] != "") {
      oTypeQuery = {
        $or: [],
      };
      req.body.eType.forEach((element) => {
        oTypeQuery["$or"].push({
          eType: element,
        });
      });
    }
    if (req.body.sCollection != "All" && req.body.sCollection != "") {
      oCollectionQuery = {
        $or: [],
      };
      oCollectionQuery["$or"].push({
        sCollection: req.body.sCollection,
      });
    }

    if (req.body.sSortingType == "Recently Added") {
      oSortingOrder["sCreated"] = -1;
    } else if (req.body.sSortingType == "Most Viewed") {
      oSortingOrder["nView"] = -1;
    } else if (req.body.sSortingType == "Price Low to High") {
      oSortingOrder["nBasePrice"] = 1;
    } else if (req.body.sSortingType == "Price High to Low") {
      oSortingOrder["nBasePrice"] = -1;
    } else {
      oSortingOrder["_id"] = -1;
    }

    if (req.body.sSellingType != "") {
      oSellingTypeQuery = {
        $or: [
          {
            eAuctionType: req.body.sSellingType,
          },
        ],
      };
    }

    let data = await NFT.aggregate([
      {
        $match: {
          $and: [
            {
              sTransactionStatus: {
                $eq: 1,
              },
            },
            {
              eAuctionType: {
                $ne: "Unlockable",
              },
            },
            oTypeQuery,
            oCollectionQuery,
            oTtextQuery,
            oSellingTypeQuery,
          ],
        },
      },
      {
        $sort: oSortingOrder,
      },
      {
        $project: {
          _id: 1,
          sName: 1,
          eType: 1,
          nBasePrice: 1,
          collectionImage: 1,
          oCurrentOwner: 1,
          eAuctionType: 1,
          sCollection: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          user_likes: {
            $size: {
              $filter: {
                input: "$user_likes",
                as: "user_likes",
                cond: {
                  $eq: [
                    "$$user_likes",
                    req.userId && req.userId != undefined && req.userId != null
                      ? mongoose.Types.ObjectId(req.userId)
                      : "",
                  ],
                },
              },
            },
          },
          user_likes_size: {
            $cond: {
              if: {
                $isArray: "$user_likes",
              },
              then: {
                $size: "$user_likes",
              },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          sName: 1,
          eType: 1,
          nBasePrice: 1,
          collectionImage: 1,
          oCurrentOwner: 1,
          eAuctionType: 1,
          sCollection: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          is_user_like: {
            $cond: {
              if: {
                $gte: ["$user_likes", 1],
              },
              then: "true",
              else: "false",
            },
          },
          user_likes_size: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "oCurrentOwner",
          foreignField: "_id",
          as: "oUser",
        },
      },
      { $unwind: "$oUser" },
      {
        $facet: {
          nfts: [
            {
              $skip: +nOffset,
            },
            {
              $limit: +nLimit,
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
    let iFiltered = data[0].nfts.length;
    if (data[0].totalCount[0] == undefined) {
      return res.reply(messages.success("Data"), {
        data: 0,
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: iFiltered,
      });
    } else {
      return res.reply(messages.no_prefix("NFT Details"), {
        data: data[0].nfts,
        draw: req.body.draw,
        recordsTotal: data[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.updateBasePrice = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body.nNFTId) return res.reply(messages.not_found("NFT ID"));
    if (!req.body.nBasePrice)
      return res.reply(messages.not_found("Base Price"));

    if (!validators.isValidObjectID(req.body.nNFTId))
      return res.reply(messages.invalid("NFT ID"));
    if (
      isNaN(req.body.nBasePrice) ||
      parseFloat(req.body.nBasePrice) <= 0 ||
      parseFloat(req.body.nBasePrice) <= 0.000001
    )
      return res.reply(messages.invalid("Base Price"));

    let oNFT = await NFT.findById(req.body.nNFTId);

    if (!oNFT) return res.reply(messages.not_found("NFT"));
    if (oNFT.oCurrentOwner != req.userId)
      return res.reply(
        message.bad_request("Only NFT Owner Can Set Base Price")
      );

    let BIdsExist = await Bid.find({
      oNFTId: mongoose.Types.ObjectId(req.body.nNFTId),
      sTransactionStatus: 1,
      eBidStatus: "Bid",
    });

    if (BIdsExist && BIdsExist != undefined && BIdsExist.length) {
      return res.reply(
        messages.bad_request("Please Cancel Active bids on this NFT.")
      );
    } else {
      NFT.findByIdAndUpdate(
        req.body.nNFTId,
        {
          nBasePrice: req.body.nBasePrice,
        },
        (err, nft) => {
          if (err) return res.reply(messages.server_error());
          if (!nft) return res.reply(messages.not_found("NFT"));

          return res.reply(messages.updated("Price"));
        }
      );
    }
  } catch (error) {
    console.log(error);
    return res.reply(messages.server_error());
  }
};

controllers.updateNftOrder = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    let sId = await NFT.findById(req.body._id);
    let nftownerID = req.body.nftownerID;

    if (!sId) return res.reply(messages.not_found("NFT"));

    await NFTowners.findByIdAndUpdate(nftownerID, {
      sOrder: req.body.sOrder,
      sSignature: req.body.sSignature,
      sTransactionStatus: 1,
      nBasePrice: req.body.nBasePrice,
    }).then((err, nftowner) => {
      //console.log("Error Update is "+JSON.stringify(err));
    });

    NFTowners.findByIdAndUpdate(
      nftownerID,
      { $inc: { nQuantityLeft: -req.body.putOnSaleQty } },
      { new: true },
      function (err, response) { }
    );
    if (req.body.erc721) {
      await NFT.findByIdAndUpdate(sId, {
        sOrder: req.body.sOrder,
        sSignature: req.body.sSignature,
        sTransactionStatus: 1,
        nBasePrice: req.body.nBasePrice,
      }).then((err, nft) => {
        //console.log("Updating By ID"+nftownerID);
        return res.reply(messages.success("Order Created"));
      });
    } else {
      return res.reply(messages.success("Order Created"));
    }
  } catch (e) {
    console.log("Error is " + e);
    return res.reply(messages.server_error());
  }
};

controllers.likeNFT = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    let { id } = req.body;

    return NFT.findOne({ _id: mongoose.Types.ObjectId(id) }).then(
      async (NFTData) => {
        if (NFTData && NFTData != null) {
          let likeMAINarray = [];
          likeMAINarray = NFTData.nUser_likes;

          let flag = "";
          //console.log("NFTData",NFTData);
          let likeARY =
            NFTData.nUser_likes && NFTData.nUser_likes.length
              ? NFTData.nUser_likes.filter(
                (v) => v.toString() == req.userId.toString()
              )
              : [];

          //console.log("like Array",likeARY);
          if (likeARY && likeARY.length) {
            flag = "dislike";
            var index = likeMAINarray.indexOf(likeARY[0]);
            if (index != -1) {
              likeMAINarray.splice(index, 1);
            }
          } else {
            flag = "like";
            likeMAINarray.push(mongoose.Types.ObjectId(req.userId));
          }

          await NFT.findByIdAndUpdate(
            { _id: mongoose.Types.ObjectId(id) },
            { $set: { nUser_likes: likeMAINarray } }
          ).then((user) => {
            // if (err) return res.reply(messages.server_error());

            if (flag == "like") {
              return res.reply(messages.updated("NFT liked successfully."));
            } else {
              return res.reply(messages.updated("NFT unliked successfully."));
            }
          });
        } else {
          return res.reply(messages.bad_request("NFT not found."));
        }
      }
    );
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.uploadImage = async (req, res) => {
  try {
    allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    errAllowed = "JPG, JPEG, PNG,GIF";

    upload(req, res, function (error) {
      if (error) {
        //instanceof multer.MulterError
        fs.unlinkSync(req.file.path);
        return res.reply(messages.bad_request(error.message));
      } else {
        if (!req.file) {
          fs.unlinkSync(req.file.path);
          return res.reply(messages.not_found("File"));
        }

        const oOptions = {
          pinataMetadata: {
            name: req.file.originalname,
          },
          pinataOptions: {
            cidVersion: 0,
          },
        };
        const readableStreamForFile = fs.createReadStream(req.file.path);
        let testFile = fs.readFileSync(req.file.path);
        //Creating buffer for ipfs function to add file to the system
        let testBuffer = new Buffer(testFile);
        try {
          pinata
            .pinFileToIPFS(readableStreamForFile, oOptions)
            .then(async (result) => {
              fs.unlinkSync(req.file.path);
              return res.reply(messages.created("Collection"), {
                track_cover: result.IpfsHash,
              });
            })
            .catch((err) => {
              //handle error here
              return res.reply(messages.error());
            });
        } catch (err) {
          console.log("err", err);
        }
      }
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getAllNfts = async (req, res) => {
  try {
    let aNft = await NFT.find({})
      .select({
        nTitle: 1,
        nCollection: 1,
        nHash: 1,
        nLazyMintingStatus: 1,
        nNftImage: 1,
      })
      .populate({
        path: "nOrders",
        options: {
          limit: 1,
        },
        select: {
          oPrice: 1,
          oType: 1,
          oValidUpto: 1,
          auction_end_date: 1,
          oStatus: 1,
          _id: 0,
        },
      })
      .populate({
        path: "nCreater",
        options: {
          limit: 1,
        },
        select: {
          _id: 0,
        },
      })
      .limit(limit)
      .skip(startIndex)
      .exec()
      .then((res) => {
        data.push(res);
      })
      .catch((e) => {
        console.log("Error", e);
      });

    results.results = data;
    //console.log("Collections",aNft);

    if (!aNft) {
      return res.reply(messages.not_found("nft"));
    }
    return res.reply(messages.no_prefix("nfts List"), aNft);
  } catch (e) {
    return res.reply(messages.error(e));
  }
};

controllers.setNFTOrder = async (req, res) => {
  try {
    let aNft = await NFT.findById(req.body.nftId);
    if (!aNft) {
      return res.reply(messages.not_found("nft"));
    }

    aNft.nOrders.push(req.body.orderId);
    await aNft.save();

    return res.reply(messages.updated("nfts List"), aNft);
  } catch (e) {
    return res.reply(messages.error(e));
  }
};

controllers.getOnSaleItems = async (req, res) => {
  try {
    let data = [];
    let OrderSearchArray = [];
    let sSellingType = req.body.sSellingType;
    let sTextsearch = req.body.sTextsearch;
    let itemType = req.body.itemType;
    const page = parseInt(req.body.page);
    const limit = parseInt(req.body.limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    OrderSearchArray["oStatus"] = 1;
    if (sSellingType !== "") {
      OrderSearchArray["oType"] = sSellingType;
    }
    let OrderSearchObj = Object.assign({}, OrderSearchArray);
    let OrderIdsss = await Order.distinct("oNftId", OrderSearchObj);

    let NFTSearchArray = [];
    NFTSearchArray["_id"] = { $in: OrderIdsss.map(String) };
    NFTSearchArray["isBlocked"] = 0;
    if (sTextsearch !== "") {
      NFTSearchArray["nTitle"] = {
        $regex: new RegExp(sTextsearch,),
        $options: "i",
      };
    }
    if (itemType !== "") {
      NFTSearchArray["nType"] = itemType;
    }
    let NFTSearchObj = Object.assign({}, NFTSearchArray);
    console.info("nftt-searr", JSON.stringify(NFTSearchObj));
    const results = {};
    if (endIndex < (await NFT.countDocuments(NFTSearchObj).exec())) {
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
    // console.log('serach obj',NFTSearchObj)
    await NFT.find(NFTSearchObj)
      .sort({ nCreated: -1 })
      .select({
        nTitle: 1,
        nCollection: 1,
        nHash: 1,
        nType: 1,
        nUser_likes: 1,
        nNftImage: 1,
        nLazyMintingStatus: 1,
        nNftImageType: 1,
        isBlocked: 1,
      })
      .populate({
        path: "nCreater",
        options: {
          limit: 1,
        },
        select: {
          _id: 1,
          sProfilePicUrl: 1,
          sWalletAddress: 1,
        },
      })
      .populate({
        path: "nOrders",
        options: {
          limit: 1,
        },
        select: {
          oPrice: 1,
          oType: 1,
          oValidUpto: 1,
          oStatus: 1,
          _id: 0,
        },
      })
      .limit(limit)
      .skip(startIndex)
      .lean()
      .exec()
      .then((res) => {
        data.push(res);
      })
      .catch((e) => {
        console.log("Error", e);
      });

    results.count = await NFT.countDocuments(NFTSearchObj).exec();
    results.results = data;
    res.header("Access-Control-Max-Age", 600);
    return res.reply(messages.success("Order List"), results);
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.getOwnedNFTlist = async (req, res) => {
  try {
    let data = [];
    const sortKey = req.body.sortKey ? req.body.sortKey : "";
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

    if (req.body.searchType === "owned") {
      if (
        endIndex <
        (await NFT.countDocuments({
          nOwnedBy: {
            $elemMatch: {
              address: req.body.userWalletAddress,
              quantity: { $gt: 0 },
            },
          },
        }).exec())
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

      await NFT.find({
        hashStatus: 1,
        nOwnedBy: {
          $elemMatch: {
            address: req.body.userWalletAddress,
            quantity: { $gt: 0 },
          },
        },
      })
        .select({
          isBlocked: 1,
          nTitle: 1,
          nCollection: 1,
          nHash: 1,
          nUser_likes: 1,
          nNftImage: 1,
          nLazyMintingStatus: 1,
          nNftImageType: 1,
          isBlocked: 1,
          hashStatus: 1,
        })
        .populate({
          path: "nOrders",
          options: {
            limit: 1,
          },
          select: {
            oPrice: 1,
            oType: 1,
            oValidUpto: 1,
            auction_end_date: 1,
            oStatus: 1,
            _id: 0,
          },
        })
        .populate({
          path: "nCreater",
          options: {
            limit: 1,
          },
          select: {
            _id: 1,
            sProfilePicUrl: 1,
            sWalletAddress: 1,
          },
        })
        .limit(limit)
        .skip(startIndex)
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });

      results.count = await NFT.countDocuments({
        hashStatus: 1,
        nOwnedBy: {
          $elemMatch: {
            address: req.body.userWalletAddress,
            quantity: { $gt: 0 },
          },
        },
      }).exec();
    } else {
      if (
        endIndex <
        (await NFT.countDocuments({
          nCreater: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
        }).exec())
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

      await NFT.find({
        hashStatus: 1,
        nCreater: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
      })
        .select({
          isBlocked: 1,
          nTitle: 1,
          nCollection: 1,
          nHash: 1,
          nUser_likes: 1,
          nNftImage: 1,
          nNftImageType: 1,
          isBlocked: 1,
          hashStatus: 1,
        })
        .populate({
          path: "nOrders",
          options: {
            limit: 1,
          },
          select: {
            oPrice: 1,
            oType: 1,
            oValidUpto: 1,
            auction_end_date: 1,
            oStatus: 1,
            _id: 0,
          },
        })
        .populate({
          path: "nCreater",
          options: {
            limit: 1,
          },
          select: {
            _id: 1,
            sProfilePicUrl: 1,
            sWalletAddress: 1,
          },
        })
        .limit(limit)
        .skip(startIndex)
        .exec()
        .then((res) => {
          if (res?.isBlocked === undefined) {
            res.isBlockedCode = false;
          } else {
            res.isBlockedCode = res?.isBlocked;
          }
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });

      results.count = await NFT.countDocuments({
        nCreater: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
      }).exec();
    }

    results.results = data;

    return res.reply(messages.success("NFTs List"), results);
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.getUserLikedNfts = async (req, res) => {
  try {
    let data = [];

    if (!req.body.userId)
      res.reply(messages.invalid_req("User Id is required"));

    //sortKey is the column
    const sortKey = req.body.sortKey ? req.body.sortKey : "";

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
      (await NFT.countDocuments({
        nUser_likes: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
      }).exec())
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

    await NFT.find({
      nUser_likes: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
    })
      .select({
        nTitle: 1,
        nCollection: 1,
        nHash: 1,
        nType: 1,
        nUser_likes: 1,
        nNftImage: 1,
        nLazyMintingStatus: 1,
        nNftImageType: 1,
        isBlocked: 1,
      })
      .populate({
        path: "nOrders",
        options: {
          limit: 1,
        },
        select: {
          oPrice: 1,
          oType: 1,
          oValidUpto: 1,
          auction_end_date: 1,
          oStatus: 1,
          _id: 0,
        },
      })
      .populate({
        path: "nCreater",
        options: {
          limit: 1,
        },
        select: {
          _id: 1,
          sProfilePicUrl: 1,
          sWalletAddress: 1,
        },
      })
      .limit(limit)
      .skip(startIndex)
      .exec()
      .then((res) => {
        data.push(res);
      })
      .catch((e) => {
        console.log("Error", e);
      });

    results.count = await NFT.countDocuments({
      nUser_likes: { $in: [mongoose.Types.ObjectId(req.body.userId)] },
    }).exec();
    results.results = data;

    return res.reply(messages.success("NFTs List Liked By User"), results);
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.getUserOnSaleNfts = async (req, res) => {
  try {
    let data = [];

    let query = {};
    let orderQuery = {};

    orderQuery["oSeller"] = mongoose.Types.ObjectId(req.body.userId);
    orderQuery["oStatus"] = 1; // we are getting only active orders

    if (req.body.hasOwnProperty("search")) {
      for (var key in req.body.search) {
        //could also be req.query and req.params
        if (req.body.search[key] !== "") {
          query[key] = req.body.search[key];
        } else {
          query[key] = null;
        }
      }
    }

    if (req.body.hasOwnProperty("searchOrder")) {
      for (var key in req.body.searchOrder) {
        //could also be req.query and req.params
        if (req.body.searchOrder[key] !== "") {
          orderQuery[key] = req.body.searchOrder[key];
        } else {
          orderQuery[key] = null;
        }
      }
    }

    //console.log("orderQuery",orderQuery);
    //select unique NFTids for status 1 and userId supplied
    let OrderIdsss = await Order.distinct("oNftId", orderQuery);
    //console.log("order idss",OrderIdsss);
    //return if no active orders found
    if (OrderIdsss.length < 1) return res.reply(messages.not_found());

    //set nftQuery
    query["_id"] = { $in: OrderIdsss };

    //sortKey is the column
    const sortKey = req.body.sortKey ? req.body.sortKey : "";

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
      endIndex < (await NFT.countDocuments({ _id: { $in: OrderIdsss } }).exec())
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

    await NFT.find({ _id: { $in: OrderIdsss } })
      .select({
        isBlocked: 1,
        nTitle: 1,
        nCollection: 1,
        nHash: 1,
        nType: 1,
        nUser_likes: 1,
        nNftImage: 1,
        nLazyMintingStatus: 1,
        nNftImageType: 1,
        isBlocked: 1,
      })
      .populate({
        path: "nOrders",
        options: {
          limit: 1,
        },
        select: {
          oPrice: 1,
          oType: 1,
          oValidUpto: 1,
          auction_end_date: 1,
          oStatus: 1,
          _id: 0,
        },
      })
      .populate({
        path: "nCreater",
        options: {
          limit: 1,
        },
        select: {
          _id: 1,
          sProfilePicUrl: 1,
          sWalletAddress: 1,
        },
      })
      .limit(limit)
      .skip(startIndex)
      .exec()
      .then((res) => {
        if (res?.isBlocked === undefined) {
          res.isBlockedCode = false;
        } else {
          res.isBlockedCode = res?.isBlocked;
        }
        data.push(res);
      })
      .catch((e) => {
        console.log("Error", e);
      });

    results.count = await NFT.countDocuments({
      _id: { $in: OrderIdsss },
    }).exec();
    results.results = data;

    return res.reply(
      messages.success("NFTs List Liked By User UpdaTeD"),
      results
    );
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.transferNfts = async (req, res) => {
  //deduct previous owner
  //console.log("req",req.body);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    let _NFT = await NFT.findOne({
      _id: mongoose.Types.ObjectId(req.body.nftId),
      "nOwnedBy.address": req.body.sender,
    }).select("nOwnedBy -_id");

    //console.log("_NFT-------->",_NFT);
    let currentQty = _NFT.nOwnedBy.find(
      (o) => o.address === req.body.sender.toLowerCase()
    ).quantity;
    let boughtQty = parseInt(req.body.qty);
    let leftQty = parseInt(currentQty) - parseInt(boughtQty);
    if (leftQty < 1) {
      await NFT.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(req.body.nftId) },
        {
          $pull: {
            nOwnedBy: { address: req.body.sender },
          },
        }
      ).catch((e) => {
        console.log("Error1", e.message);
      });
    } else {
      await NFT.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(req.body.nftId),
          "nOwnedBy.address": req.body.sender,
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
      _id: mongoose.Types.ObjectId(req.body.nftId),
      "nOwnedBy.address": req.body.receiver,
    });
    if (subDocId) {
      //console.log("Subdocument Id",subDocId);

      let _NFTB = await NFT.findOne({
        _id: mongoose.Types.ObjectId(req.body.nftId),
        "nOwnedBy.address": req.body.receiver,
      }).select("nOwnedBy -_id");
      currentQty = _NFTB.nOwnedBy.find(
        (o) => o.address === req.body.receiver.toLowerCase()
      ).quantity
        ? parseInt(
          _NFTB.nOwnedBy.find(
            (o) => o.address === req.body.receiver.toLowerCase()
          ).quantity
        )
        : 0;
      boughtQty = req.body.qty;
      let ownedQty = parseInt(currentQty) + parseInt(boughtQty);

      await NFT.findOneAndUpdate(
        {
          _id: mongoose.Types.ObjectId(req.body.nftId),
          "nOwnedBy.address": req.body.receiver,
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
      //console.log("Subdocument Id not found");
      let dataToadd = {
        address: req.body.receiver,
        quantity: parseInt(req.body.qty),
      };
      await NFT.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(req.body.nftId) },
        { $addToSet: { nOwnedBy: dataToadd } },
        { upsert: true }
      );
      //console.log("wasn't there but added");
    }
    return res.reply(messages.updated("NFT"));
  } catch (e) {
    console.log("errr", e);
    return res.reply(messages.error());
  }
};

controllers.getCollectionNFT = async (req, res) => {
  try {
    let data = [];
    let collection = req.body.collection;

    const sortKey = req.body.sortKey ? req.body.sortKey : "";
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
    let orderQuery = {};

    orderQuery["oStatus"] = 1; // we are getting only active orders

    let OrderIdsss = await Order.distinct("oNftId", orderQuery);

    if (
      endIndex <
      (await NFT.countDocuments({
        nCollection: collection,
        _id: { $in: OrderIdsss },
      }).exec())
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

    await NFT.find({ nCollection: collection, _id: { $in: OrderIdsss } })
      .select({
        nTitle: 1,
        nCollection: 1,
        nHash: 1,
        nCreater: 1,
        nType: 1,
        nUser_likes: 1,
        nNftImage: 1,
        nLazyMintingStatus: 1,
        nNftImageType: 1,
        isBlocked: 1,
      })
      .populate({
        path: "nOrders",
        options: {
          limit: 1,
        },
        select: {
          oPrice: 1,
          oType: 1,
          oValidUpto: 1,
          auction_end_date: 1,
          oStatus: 1,
          _id: 0,
        },
      })
      .populate({
        path: "nCreater",
        options: {
          limit: 1,
        },
        select: {
          _id: 1,
          sProfilePicUrl: 1,
          sWalletAddress: 1,
        },
      })
      .limit(limit)
      .skip(startIndex)
      .exec()
      .then((res) => {
        data.push(res);
      })
      .catch((e) => {
        console.log("Error", e);
      });
    results.count = await NFT.countDocuments({
      nCollection: collection,
      _id: { $in: OrderIdsss },
    }).exec();
    results.results = data;
    return res.reply(messages.success("Order List"), results);
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.getCollectionNFTOwned = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    let data = [];
    let collection = req.body.collection;
    let userID = req.userId;
    let UserData = await User.findById(userID);
    if (UserData) {
      let userWalletAddress = UserData.sWalletAddress;

      const sortKey = req.body.sortKey ? req.body.sortKey : "";
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
        (await NFT.countDocuments({
          nCollection: collection,
          "nOwnedBy.address": userWalletAddress,
        }).exec())
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
      await NFT.find({
        nCollection: collection,
        "nOwnedBy.address": userWalletAddress,
      })
        .select({
          nTitle: 1,
          nCollection: 1,
          nHash: 1,
          nType: 1,
          nUser_likes: 1,
          nNftImage: 1,
          nLazyMintingStatus: 1,
          nNftImageType: 1,
          isBlocked: 1,
        })
        .populate({
          path: "nOrders",
          options: {
            limit: 1,
          },
          select: {
            oPrice: 1,
            oType: 1,
            oStatus: 1,
            _id: 0,
          },
        })
        .populate({
          path: "nCreater",
          options: {
            limit: 1,
          },
          select: {
            _id: 1,
            sProfilePicUrl: 1,
            sWalletAddress: 1,
          },
        })
        .limit(limit)
        .skip(startIndex)
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });
      results.count = await NFT.countDocuments({
        nCollection: collection,
        "nOwnedBy.address": userWalletAddress,
      }).exec();
      results.results = data;
      return res.reply(messages.success("Order List"), results);
    } else {
      console.log("Bid Not found");
      return res.reply("User Not found");
    }
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.getSearchedNft = async (req, res) => {
  try {
    let data = [];
    let setConditions = req.body.conditions;

    //sortKey is the column
    const sortKey = req.body.sortKey ? req.body.sortKey : "";

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
    let OrderIdsss = await Order.distinct("oNftId", setConditions);

    if (
      endIndex <
      (await NFT.countDocuments({
        nTitle: { $regex: req.body.sTextsearch, $options: "i" },
        _id: { $in: OrderIdsss.map(String) },
      }).exec())
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

    await NFT.find({
      nTitle: { $regex: req.body.sTextsearch, $options: "i" },
      _id: { $in: OrderIdsss.map(String) },
    })
      .select({
        nTitle: 1,
        nCollection: 1,
        nHash: 1,
        nType: 1,
        nUser_likes: 1,
        nNftImage: 1,
        nLazyMintingStatus: 1,
        isBlocked: 1,
      })
      .populate({
        path: "nOrders",
        options: {
          limit: 1,
        },
        select: {
          oPrice: 1,
          oType: 1,
          auction_end_date: 1,
          oValidUpto: 1,
          oStatus: 1,
          _id: 0,
        },
      })
      .populate({
        path: "nCreater",
        options: {
          limit: 1,
        },
        select: {
          _id: 0,
        },
      })
      .limit(limit)
      .skip(startIndex)
      .exec()
      .then((res) => {
        data.push(res);
        results.count = res.length;
      })
      .catch((e) => {
        console.log("Error", e);
      });

    results.count = await NFT.countDocuments({
      nTitle: { $regex: req.body.sTextsearch, $options: "i" },
      _id: { $in: OrderIdsss.map(String) },
    }).exec();
    results.results = data;

    return res.reply(messages.success("NFTs List"), results);
  } catch (error) {
    console.log("Error:", error);
    return res.reply(messages.error());
  }
};

controllers.updateCollectionToken = async (req, res) => {
  try {
    console.log("update collection token is called", req.body);
    console.log('reqdddd', req.params.collectionAddress);
    if (!req.params.collectionAddress)
      return res.reply(messages.not_found("Contract Address Not Found"));
    const contractAddress = req.params.collectionAddress;

    const collection = await Collection.findOne({
      sContractAddress: contractAddress,
    });
    console.log("colelellel", collection)
    let nextId = collection.getNextId();
    console.log(nextId)
    collection.nextId = nextId + 1;
    collection.save();
    console.log("Work donee")
    return res.reply(messages.success("Token Updated", nextId + 1));
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getBanner = async (req, res) => {
  try {
    let data = await Banner.find();
    return res.reply(messages.success(), data);
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.updateOwners = async (req, res) => {
  console.log("owners", req.body);
  try {
    let ownersData = req.body.ownersData;
    let tokenID = req.body.tokenID;
    let collection = req.body.collection;

    let data = await NFT.updateOne(
      { nTokenID: tokenID, nCollection: collection },
      { $set: { nOwnedBy: ownersData } }
    );
    console.log("dataa", data);
    return res.reply(messages.success(), data);
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.updateStatus = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    console.log("Here");
    console.log("req", req.body);
    if (!req.body.recordID) {
      return res.reply(messages.not_found("Record ID"));
    }
    if (!req.body.DBCollection) {
      return res.reply(messages.not_found("Collection Name"));
    }
    if (req.body.hashStatus === undefined) {
      return res.reply(messages.not_found("Hash Status"));
    }
    let hash = "";
    if (req.body.hash !== undefined) {
      hash = req.body.hash;
    }
    let details = {};

    details = {
      hashStatus: req.body.hashStatus,
    };
    if (hash !== "") {
      details.hash = hash;
    }
    let DBCollection = req.body.DBCollection;
    if (DBCollection === "NFT") {
      console.log("Inside NFT");
      await NFT.find(
        { _id: mongoose.Types.ObjectId(req.body.recordID) },
        async function (errf, nftFound) {
          if (errf) return res.reply(messages.server_error());
          if (!nftFound) return res.reply(messages.not_found("NFT"));
          if (
            nftFound.hashStatus === req.body.hashStatus &&
            (nftFound.hash !== "" ||
              nftFound.hash !== "0x0" ||
              nftFound.hash !== undefined)
          )
            return res.reply(messages.already_exists("Same Data"));
        }
      );
      await NFT.findByIdAndUpdate(
        req.body.recordID,
        details,
        (err, resData) => {
          if (err) return res.reply(messages.server_error());
          if (!resData) return res.reply(messages.not_found("NFT"));

          return res.reply(messages.successfully("NFT Hash Status Updated"));
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    }
    if (DBCollection === "Collection") {
      console.log("Inside Collection");
      details = {
        hashStatus: req.body.hashStatus,
        contractAddress: req.body.contractAddress,
      };
      await Collection.find(
        { _id: mongoose.Types.ObjectId(req.body.recordID) },
        async function (errf, nftFound) {
          if (errf) return res.reply(messages.server_error());
          if (!nftFound) return res.reply(messages.not_found("NFT"));
          if (
            nftFound.hashStatus === req.body.hashStatus &&
            (nftFound.hash !== "" ||
              nftFound.hash !== "0x0" ||
              nftFound.hash !== undefined)
          )
            return res.reply(messages.already_exists("Same Data"));
        }
      );
      await Collection.findByIdAndUpdate(
        req.body.recordID,
        details,
        (err, resData) => {
          if (err) return res.reply(messages.server_error());
          if (!resData) return res.reply(messages.not_found("Collection"));
          return res.reply(
            messages.successfully("Collection Hash Status Updated")
          );
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    }
    if (DBCollection === "Order") {
      console.log("Inside Order");
      await Order.find(
        { _id: mongoose.Types.ObjectId(req.body.recordID) },
        async function (errf, nftFound) {
          if (errf) return res.reply(messages.server_error());
          if (!nftFound) return res.reply(messages.not_found("NFT"));
          if (
            nftFound.hashStatus === req.body.hashStatus &&
            (nftFound.hash !== "" ||
              nftFound.hash !== "0x0" ||
              nftFound.hash !== undefined)
          )
            return res.reply(messages.already_exists("Same Data"));
        }
      );
      await Order.findByIdAndUpdate(
        req.body.recordID,
        details,
        (err, resData) => {
          if (err) return res.reply(messages.server_error());
          if (!resData) return res.reply(messages.not_found("Order"));
          console.log(
            "status--------------------------------->",
            resData.hashStatus,
            req.body.hashStatus
          );
          return res.reply(messages.successfully("Order Hash Status Updated"));
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    }
    if (DBCollection === "Bids") {
      console.log("Inside Bids");
      await Bid.find(
        { _id: mongoose.Types.ObjectId(req.body.recordID) },
        async function (errf, nftFound) {
          if (errf) return res.reply(messages.server_error());
          if (!nftFound) return res.reply(messages.not_found("NFT"));
          if (
            nftFound.hashStatus === req.body.hashStatus &&
            (nftFound.hash !== "" ||
              nftFound.hash !== "0x0" ||
              nftFound.hash !== undefined)
          )
            return res.reply(messages.already_exists("Same Data"));
        }
      );
      await Bid.findByIdAndUpdate(
        req.body.recordID,
        details,
        (err, resData) => {
          console.log("data", resData);
          if (err) return res.reply(messages.server_error());
          if (!resData) return res.reply(messages.not_found("Bids"));
          return res.reply(messages.successfully("Bids Hash Status Updated"));
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    }
  } catch (error) {
    console.log("Error", error);
    return res.reply(messages.server_error());
  }
};

controllers.updateOwnerWithOrder = async (req, res) => {
  console.log("owners", req.body);
  try {
    let owner = req.body.owner.toLowerCase();
    let qty = req.body.qty;
    let tokenID = req.body.tokenID;
    let collection = req.body.collection;

    let data = await NFT.exists({
      nTokenID: tokenID,
      nCollection: collection,
      nOwnedBy: {
        $elemMatch: {
          address: owner,
        },
      },
    });
    console.log("nft found for user", data);

    if (data) {
      let isExist = await NFT.exists({
        nTokenID: tokenID,
        nCollection: collection,
        nOwnedBy: {
          $elemMatch: {
            address: owner.toLowerCase(),
            quantity: qty,
          },
        },
      });

      console.log("Same data exist", isExist);
      if (!isExist) {
        console.log("same data doesn't exist so do something");
        if (parseInt(qty) === 0) {
          console.log("owner deleted as it owns no qty");
        } else {
          console.log("updating owner qty");

          console.log("owner qty updated to", qty);
        }

        let orders = await Order.find(
          {
            oTokenId: tokenID,
            oTokenAddress: collection,
            oSellerWalletAddress: owner?.toLowerCase(),
          },
          async (err, orderRes) => {
            if (err) {
              console.log("Error on Database Query", err);
              return res.reply(messages.error(), err);
            } else {
              console.log("orders to be updated", orderRes);

              orderRes.map(async (o, i) => {
                let leftQty = parseInt(o.oQuantity) - parseInt(o.quantity_sold);
                console.log("left qty", leftQty);
                if (leftQty > qty) {
                  leftQty = qty;
                }
                if (leftQty <= 0) {
                  console.log("left 1");
                  // Remove order and Bids/Offers of that owner if bid qty>owned
                  await Bid.deleteMany({
                    oOrderId: mongoose.Types.ObjectId(o._id),
                  }).then(() => {
                    console.log("bid deleted as remaining qty is 0");
                  });
                  await Order.deleteMany({
                    _id: mongoose.Types.ObjectId(o._id),
                  }).then(() => {
                    console.log("order deleted as remaining qty is 0");
                  });
                } else {
                  console.log("left 2");
                  if (leftQty >= qty) {
                    console.log("left 3");
                    await Bid.deleteMany({
                      oOrderId: mongoose.Types.ObjectId(o._id),
                      tokenId: tokenID,
                      tokenAddress: collection,
                      oBidQuantity: { $gt: qty },
                    })
                      .then(function () {
                        console.log("Bid Data Deleted");
                      })
                      .catch(function (error) {
                        console.log("Error in Bid Data Deleted", error);
                        return res.reply(messages.error(), error);
                      });
                    await Order.findOneAndUpdate(
                      { _id: mongoose.Types.ObjectId(o._id) },
                      {
                        $set: {
                          quantity_sold: parseInt(o.oQuantity) - parseInt(qty),
                        },
                      }
                    ).catch((e) => {
                      console.log("Error1", e.message);
                      return res.reply(messages.error(), e);
                    });
                  } else {
                  }
                }
              });
            }
          }
        );
      }
    }
    // if owner doesn't exist then add owner
    else {
      console.log("in else part of updateOwner");
      if (parseInt(qty) !== 0) {
        try {
          let orders = await Order.find(
            {
              oTokenId: tokenID,
              oTokenAddress: collection,
              oSellerWalletAddress: owner?.toLowerCase(),
            },
            async (err, orderRes) => {
              if (err) {
                console.log("Error on Database Query", err);
                return res.reply(messages.error(), err);
              } else {
                console.log("orders to be updated", orderRes);

                orderRes.map(async (o, i) => {
                  await Bid.deleteMany({
                    oOrderId: mongoose.Types.ObjectId(o._id),
                  }).then(() => {
                    console.log("bid deleted as remaining qty is 0");
                  });
                  await Order.deleteMany({
                    _id: mongoose.Types.ObjectId(o._id),
                  }).then(() => {
                    console.log("order deleted as remaining qty is 0");
                  });
                });
              }
            }
          );
        } catch (error) {
          return res.reply(messages.error(), error);
        }

        console.log("owner added");
      }
    }

    await NFT.findOne(
      { nTokenID: tokenID, nCollection: collection },
      async function (errNFT, nftDataFound) {
        if (errNFT) {
          console.log("Error in finding NFT", errNFT);
          throw errNFT;
        }
        if (nftDataFound !== undefined) {
          let ContractAddress = nftDataFound?.nCollection;
          let tokenID = nftDataFound?.nTokenID;
          let ERCType = nftDataFound?.nType;
          if (ContractAddress !== undefined) {
            let buyerAddress = owner;
            console.log("type", ERCType);
            if (ERCType === 1) {
              let con = new web3.eth.Contract(ERC721ABI.abi, ContractAddress);
              let currentOwnerAddress = await con.methods
                .ownerOf(tokenID)
                .call();
              console.log("currentOwnerAddress", currentOwnerAddress);
              let OwnedBy = [];
              OwnedBy.push({
                address: currentOwnerAddress.toLowerCase(),
                quantity: 1,
              });
              let updateNFTData = { nOwnedBy: OwnedBy };
              await NFT.findOneAndUpdate(
                { nTokenID: tokenID, nCollection: collection },
                { $set: updateNFTData },
                { new: true },
                async function (errUpdate, updateNFT) {
                  console.log("nft updated", updateNFT);
                  if (errUpdate) {
                    console.log("Error in Updating Qty ERC 721", errUpdate);
                  }
                }
              );
            } else {
              let con = new web3.eth.Contract(ERC1155ABI.abi, ContractAddress);
              let buyerCurrentQty = await con.methods
                .balanceOf(buyerAddress, tokenID)
                .call();
              console.log("buyerCurrently", typeof buyerCurrentQty);
              if (
                parseInt(buyerCurrentQty) === 0 ||
                buyerCurrentQty === undefined
              ) {
                console.log("update nft", parseInt(buyerCurrentQty));
                await NFT.findOneAndUpdate(
                  { nTokenID: tokenID, nCollection: collection },
                  { $pull: { nOwnedBy: { address: owner } } }
                ).catch((e) => {
                  console.log("Error in Deleting Seller Qty ", e.message);
                });
              } else if (data && parseInt(buyerCurrentQty) > 0) {
                console.log("update 222", parseInt(buyerCurrentQty));
                await NFT.findOneAndUpdate(
                  {
                    nTokenID: tokenID,
                    nCollection: collection,
                    "nOwnedBy.address": owner,
                  },
                  { $set: { "nOwnedBy.$.quantity": parseInt(buyerCurrentQty) } }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              } else if (parseInt(buyerCurrentQty) > 0) {
                console.log("update 333", buyerCurrentQty);
                await NFT.findOneAndUpdate(
                  {
                    nTokenID: tokenID,
                    nCollection: collection,
                  },
                  {
                    $push: {
                      nOwnedBy: {
                        address: owner,
                        quantity: parseInt(buyerCurrentQty),
                      },
                    },
                  }
                ).catch((e) => {
                  console.log("Error2", e.message);
                });
              }
            }
          } else {
            console.log("Error in finding Collection", nftDataFound);
            return res.reply(messages.not_found(), "Collection Not found.");
          }
        } else {
          console.log("Error in finding NFT Data", nftDataFound);
          return res.reply(messages.not_found(), "NFT.");
        }
      }
    );

    return res.reply(messages.success(), "");
  } catch (error) {
    return res.reply(messages.error(), error);
  }
};

controllers.getUnlockableContent = async (req, res) => {
  try {
    console.log("req", req.body);
    if (!validators.isValidSignature(req.body))
      return res.reply(messages.invalid("Signature"));
    let data = await NFT.findOne({
      _id: mongoose.Types.ObjectId(req.body.nftId),
      "nOwnedBy.address": req.body.sWalletAddress,
    });
    console.log("data", data);
    return res.reply(messages.success(), data?.nLockedContent);
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

module.exports = controllers;
