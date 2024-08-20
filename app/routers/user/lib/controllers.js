/* eslint-disable no-undef */

const ipfsAPI = require("ipfs-api");
const ipfs = ipfsAPI("ipfs.infura.io", "5001", {
  protocol: "https",
  auth: "21w11zfV67PHKlkAEYAZWoj2tsg:f2b73c626c9f1df9f698828420fa8439",
});
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const fs = require("fs");
const https = require("https");
const path = require("path");
const randomstring = require("randomstring");
const axios = require("axios");

const mongoose = require("mongoose");

const {
  User,
  NewsLetterEmail,
  Category,
  Aboutus,
  Terms,
  FAQs,
  NFT,
} = require("../../../models");
const _ = require("../../../../globals/lib/helper");

const validators = require("./validators");
const controllers = {};

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
});

let fileFilter = function (req, file, cb) {
  var allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      {
        success: false,
        message:
          "Invalid file type! Only JPG, JPEG , PNG and GIF image files are allowed.",
      },
      false
    );
  }
};

let oMulterObj = {
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 8mb
  },
  fileFilter: fileFilter,
};

controllers.profile = (req, res) => {
  try {
    User.findOne(
      {
        _id: req.userId,
      },
      {
        oName: 1,
        sUserName: 1,
        sWalletAddress: 1,
        sProfilePicUrl: 1,
        sWebsite: 1,
        sBio: 1,
        sStatus: 1,
      },
      (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));
        return res.reply(messages.no_prefix("User Details"), user);
      }
    );
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.myprofile = (req, res) => {
  try {
    const cookie = req.headers;
    if (!req.userId) {
      return res.reply(messages.unauthorized());
    }
    User.findOne(
      {
        _id: req.userId,
      },
      {
        oName: 1,
        sUserName: 1,
        sCreated: 1,
        sEmail: 1,
        sWalletAddress: 1,
        sProfilePicUrl: 1,
        sWebsite: 1,
        sBio: 1,
        sStatus: 1,
        user_followings_size: {
          $cond: {
            if: {
              $isArray: "$user_followings",
            },
            then: {
              $size: "$user_followings",
            },
            else: 0,
          },
        },
        user_followers_size: 1,
      },
      (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));
        return res.reply(messages.no_prefix("User Details"), user);
      }
    );
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

const upload = multer(oMulterObj).single("userProfile");

controllers.updateProfile = async (req, res, next) => {
  console.log("file", req.file);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    // File upload
    let oProfileDetails = {};

    await upload(req, res, async (error) => {
      if (error) return res.reply(messages.bad_request(error.message));

      await User.findOne(
        { sUserName: req.body.sUserName },
        async (err, user) => {
          if (err) return res.reply("hhh");
          if (user)
            if (user._id.toString() !== req.userId.toString()) {
              return res.reply(
                messages.already_exists(
                  "User with Username '" + req.body.sUserName + "'"
                )
              );
            }
          oProfileDetails = {
            sUserName: req.body.sUserName,
            oName: {
              sFirstname: req.body.sFirstname,
              sLastname: req.body.sLastname,
            },
            sWebsite: req.body.sWebsite,
            sBio: req.body.sBio,
            sEmail: req.body.sEmail,
          };

          console.log("here--->>");
          const aAllowedMimes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
          ];
          let newFileURl = req.file.location;
          //if (req.body.nNftImageType === "mp4") {
          newFileURl = newFileURl.replace("http://", "https://");
          var prefix = "https://";
          if (newFileURl.substr(0, prefix.length) !== prefix) {
            newFileURl = prefix + newFileURl;
          }
          if (req.file !== undefined) {
            if (!aAllowedMimes.includes(req.file.mimetype)) {
              return res.reply(messages.invalid("File Type"));
            }
            oProfileDetails["sProfilePicUrl"] = newFileURl;
            console.log("req.file.location", req.file.location);
          }
          await User.findByIdAndUpdate(
            req.userId,
            oProfileDetails,
            (err, user) => {
              if (err) return res.reply(messages.server_error());
              if (!user) return res.reply(messages.not_found("User"));
              req.session["name"] = req.body.sFirstname;
              return res.reply(messages.successfully("User Details Updated"));
            }
          ).catch((e) => {
            console.log("eeee", e);
            return res.reply(messages.error());
          });
        }
      );
    });
  } catch (error) {
    console.log("eeeeeeeeesfgdfg", error);
    return res.reply(messages.server_error());
  }
};

controllers.addCollaborator = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body) return res.reply(messages.not_found("Collaborator Details"));

    if (!validators.isValidWalletAddress(req.body.sAddress))
      return res.reply(messages.invalid("Collaborator Address"));
    if (
      !validators.isValidString(req.body.sFullname) ||
      !validators.isValidName(req.body.sFullname)
    )
      return res.reply(messages.invalid("Collaborator Name"));

    req.body.sAddress = _.toChecksumAddress(req.body.sAddress);

    User.findById(req.userId, (err, user) => {
      if (err) return res.reply(messages.server_error());
      if (!user) return res.reply(messages.not_found("User"));

      if (user.sWalletAddress == req.body.sAddress)
        return res.reply(
          messages.bad_request("You Can't Add Yourself As a Collaborator")
        );

      let aUserCollaborators = user.aCollaborators;
      let bAlreadyExists;
      aUserCollaborators.forEach((oCollaborator) => {
        if (oCollaborator.sAddress == req.body.sAddress) bAlreadyExists = true;
      });

      if (bAlreadyExists)
        return res.reply(messages.already_exists("Collaborator"));

      oCollaboratorDetails = {
        $push: {
          aCollaborators: [req.body],
        },
      };
      User.findByIdAndUpdate(req.userId, oCollaboratorDetails, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        return res.reply(messages.successfully("Collaborator Added"));
      });
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.collaboratorList = async (req, res) => {
  try {
    // Per page limit
    var nLimit = parseInt(req.body.length);
    // From where to start
    var nOffset = parseInt(req.body.start);

    let oAggregation = [
      {
        $match: {
          $and: [
            {
              _id: {
                $eq: mongoose.Types.ObjectId(req.userId),
              },
            },
          ],
        },
      },
      {
        $project: {
          totalCollaborators: {
            $cond: [
              {
                $not: ["$aCollaborators"],
              },
              0,
              {
                $size: "$aCollaborators",
              },
            ],
          },
          aCollaborators: {
            $cond: [
              {
                $not: ["$aCollaborators"],
              },
              [],
              {
                $slice: ["$aCollaborators", nOffset, nLimit],
              },
            ],
          },
        },
      },
    ];

    let aUsers = await User.aggregate(oAggregation);

    let data = aUsers[0].aCollaborators;

    return res.status(200).json({
      message: "Collaborator List Details",
      data: data,
      draw: req.body.draw,
      recordsTotal: aUsers[0].totalCollaborators,
      recordsFiltered: aUsers[0].totalCollaborators,
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getCollaboratorList = (req, res) => {
  try {
    User.findById(req.userId, (err, user) => {
      if (err) return res.reply(messages.server_error());
      if (!user) return res.reply(messages.not_found("User"));
      return res.reply(
        messages.successfully("Collaborator Detials"),
        user.aCollaborators
      );
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.addNewsLetterEmails = async (req, res) => {
  try {
    if (!req.body.sName || !req.body.sEmail)
      return res.reply(messages.required_field("Name and Email "));
    if (_.isEmail(req.body.sEmail)) return res.reply(messages.invalid("Email"));
    if (_.isUserName(req.body.sName))
      return res.reply(messages.invalid("Username"));

    const newsLetterEmail = new NewsLetterEmail({
      sName: req.body.sName,
      sEmail: req.body.sEmail,
    });
    newsLetterEmail
      .save()
      .then((result) => {
        return res.reply(messages.success(), {
          Name: req.body.sName,
          Email: req.body.sEmail,
        });
      })
      .catch((error) => {
        if (error.code == 11000)
          return res.reply(messages.already_exists("Email"));
        return res.reply(messages.error());
      });
  } catch (err) {
    return res.reply(messages.server_error());
  }
};

controllers.deleteCollaborator = (req, res) => {
  log.green(req.params.collaboratorAddress);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.params.collaboratorAddress)
      return res.reply(messages.not_found("Collaborator Address"));

    if (!validators.isValidWalletAddress(req.params.collaboratorAddress))
      return res.reply(messages.invalid("Collaborator Address"));

    User.findById(req.userId, (err, user) => {
      if (err) return res.reply(messages.server_error());
      if (!user) return res.reply(messages.not_found("User"));

      let aUserCollaborators = user.aCollaborators;

      aUserCollaborators.forEach((oCollaborator, index) => {
        if (oCollaborator.sAddress == req.params.collaboratorAddress) {
          aUserCollaborators[index] =
            aUserCollaborators[aUserCollaborators.length - 1];
          aUserCollaborators.pop();
          return;
        }
      });

      user.aCollaborators = aUserCollaborators;

      User.findByIdAndUpdate(req.userId, user, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        return res.reply(messages.successfully("Collaborator Deleted"));
      });
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getCollaboratorName = (req, res) => {
  log.green(req.params.collaboratorAddress);
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.params.collaboratorAddress)
      return res.reply(messages.not_found("Collaborator Address"));

    if (!validators.isValidWalletAddress(req.params.collaboratorAddress))
      return res.reply(messages.invalid("Collaborator Address"));

    User.findById(req.userId, (err, user) => {
      if (err) return res.reply(messages.server_error());
      if (!user) return res.reply(messages.not_found("User"));

      let aUserCollaborators = user.aCollaborators;

      if (!aUserCollaborators[0])
        return res.reply(messages.not_found("Collaborator"));

      let oCollaborator;

      aUserCollaborators.forEach((collaborator) => {
        if (collaborator.sAddress == req.params.collaboratorAddress) {
          oCollaborator = collaborator;
          return;
        }
      });

      return res.reply(messages.successfully("Details Found"), oCollaborator);
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.editCollaborator = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());
    if (!req.body) return res.reply(messages.not_found("Collaborator Details"));

    if (!validators.isValidWalletAddress(req.body.sAddress))
      return res.reply(messages.invalid("Collaborator Address"));
    if (!validators.isValidWalletAddress(req.body.sPreviousAddress))
      return res.reply(messages.invalid("Previous Address"));
    if (
      !validators.isValidString(req.body.sFullname) ||
      !validators.isValidName(req.body.sFullname)
    )
      return res.reply(messages.invalid("Collaborator Name"));

    req.body.sAddress = _.toChecksumAddress(req.body.sAddress);

    let aUsers = await User.find({
      sWalletAddress: req.body.sAddress,
    });

    if (!aUsers.length)
      return res.reply(
        messages.bad_request("User with the given address is not registered")
      );

    User.findById(req.userId, (err, user) => {
      if (err) return res.reply(messages.server_error());
      if (!user) return res.reply(messages.not_found("User"));

      if (user.sWalletAddress == req.body.sAddress)
        return res.reply(
          messages.bad_request("You Can't Add Yourself As a Collaborator")
        );

      let aUserCollaborators = user.aCollaborators;
      aUserCollaborators.forEach((oCollaborator, index) => {
        if (oCollaborator.sAddress == req.body.sPreviousAddress) {
          aUserCollaborators[index].sFullname = req.body.sFullname;
          aUserCollaborators[index].sAddress = req.body.sAddress;
          return;
        }
      });
      user.aCollaborators = aUserCollaborators;
      User.findByIdAndUpdate(req.userId, user, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        return res.reply(messages.successfully("Collaborator Updated"));
      });
    });
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

controllers.getCategories = async (req, res) => {
  try {
    const aCategories = await Category.find(
      {
        sStatus: {
          $ne: "Deactivated",
        },
      },
      {
        _id: 0,
        sName: 1,
      }
    ).sort({
      sName: 1,
    });

    return res.reply(messages.success(), {
      aCategories,
    });
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.getAboutusData = async (req, res) => {
  try {
    const aAboutus = await Aboutus.findOne(
      {},
      {
        _id: 0,
      }
    ).sort({
      _id: -1,
    });
    return res.reply(messages.success(), {
      aAboutus,
    });
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.getFAQsData = async (req, res) => {
  try {
    const aFAQs = await FAQs.find({}, {}).sort({ sOrder: 1 });
    return res.reply(messages.success(), aFAQs);
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.getTermsData = async (req, res) => {
  try {
    const aTerms = await Terms.findOne(
      {},
      {
        _id: 0,
      }
    ).sort({
      _id: -1,
    });
    return res.reply(messages.success(), {
      aTerms,
    });
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.getUserProfilewithNfts = async (req, res) => {
  console.log("req", req.body);
  try {
    // if (!req.body.currUserId) {
    //   return res.reply(messages.unauthorized());
    // }
    User.findOne(
      {
        _id: req.body.userId,
      },
      {
        oName: 1,
        sUserName: 1,
        sWalletAddress: 1,
        sProfilePicUrl: 1,
        sWebsite: 1,
        sBio: 1,
        user_followings: req.body.userId
          ? {
              $filter: {
                input: "$user_followings",
                as: "user_followings",
                cond: {
                  $eq: [
                    "$$user_followings",
                    mongoose.Types.ObjectId(req.body.userId),
                  ],
                },
              },
            }
          : [],
        user_followings_size: {
          $cond: {
            if: {
              $isArray: "$user_followings",
            },
            then: {
              $size: "$user_followings",
            },
            else: 0,
          },
        },
        user_followers_size: 1,
      },
      (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        return res.reply(messages.no_prefix("User Details"), user);
      }
    );
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.getUserWithNfts = async (req, res) => {
  try {
    if (!req.body.userId) return res.reply(messages.unauthorized());

    var nLimit = parseInt(req.body.length);
    var nOffset = parseInt(req.body.start);
    let oSortingOrder = {};
    log.red(req.body);

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
    console.log("-----------------------------------------------2");

    let data = await NFT.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  oCurrentOwner: mongoose.Types.ObjectId(req.body.userId),
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
          sHash: 1,
          nQuantity: 1,
          nTokenID: 1,
          oCurrentOwner: 1,
          sTransactionStatus: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          eAuctionType: 1,
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
          sHash: 1,
          nQuantity: 1,
          nTokenID: 1,
          oCurrentOwner: 1,
          sTransactionStatus: 1,
          sGenre: 1,
          sBpm: 1,
          skey_equalTo: 1,
          skey_harmonicTo: 1,
          track_cover: 1,
          eAuctionType: 1,
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

    console.log("-----------------------------------------------2");
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
    log.red(error);
    return res.reply(messages.server_error());
  }
};

controllers.getAllUserDetails = async (req, res) => {
  try {
    let data = [];
    const page = parseInt(req.body.page);
    const limit = parseInt(req.body.limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    let sTextsearch = req.body.sTextsearch;

    let UserSearchArray = [];
    if (req.userId) {
      UserSearchArray["_id"] = { $ne: mongoose.Types.ObjectId(req.userId) };
    }

    let UserSearchObj = Object.assign({}, UserSearchArray);
    console.log(UserSearchObj);
    let totalCount = 0;
    if (sTextsearch === "") {
      totalCount = await User.countDocuments(UserSearchObj).exec();
    } else {
      totalCount = await User.countDocuments({
        _id: { $ne: mongoose.Types.ObjectId(req.userId) },
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: {
                  $concat: ["$oName.sFirstname", " ", "$oName.sLastname"],
                },
                regex: new RegExp(sTextsearch), //Your text search here
                options: "i",
              },
            },
          },
          { sUserName: { $regex: new RegExp(sTextsearch), $options: "i" } },
          {
            sWalletAddress: { $regex: new RegExp(sTextsearch), $options: "i" },
          },
        ],
      }).exec();
    }

    const results = {};
    if (endIndex < totalCount) {
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
    if (sTextsearch !== "") {
      await User.find(UserSearchObj)
        .find({
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: ["$oName.sFirstname", " ", "$oName.sLastname"],
                  },
                  regex: new RegExp(sTextsearch), //Your text search here
                  options: "i",
                },
              },
            },
            { sUserName: { $regex: new RegExp(sTextsearch), $options: "i" } },
            {
              sWalletAddress: {
                $regex: new RegExp(sTextsearch),
                $options: "i",
              },
            },
          ],
        })
        .sort({ sCreated: -1 })
        .select({
          sWalletAddress: 1,
          sUserName: 1,
          oName: 1,
          sProfilePicUrl: 1,
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
    } else {
      await User.find(UserSearchObj)
        .sort({ sCreated: -1 })
        .select({
          sWalletAddress: 1,
          sUserName: 1,
          oName: 1,
          sProfilePicUrl: 1,
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
    }

    results.count = totalCount;
    results.results = data;
    res.header("Access-Control-Max-Age", 600);
    return res.reply(messages.success("Author List"), results);
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};
controllers.followUser = async (req, res) => {
  try {
    if (!req.userId) return res.reply(messages.unauthorized());

    let { id } = req.body;

    return User.findOne({ _id: mongoose.Types.ObjectId(id) }).then(
      async (userData) => {
        if (userData && userData != null) {
          let followMAINarray = [];
          followMAINarray = userData.user_followings;

          let flag = "";

          let followARY =
            userData.user_followings && userData.user_followings.length
              ? userData.user_followings.filter(
                  (v) => v.toString() == req.userId.toString()
                )
              : [];
          let CurrUser = User.findOne({
            _id: mongoose.Types.ObjectId(req.userId),
          });
          let followerSize = CurrUser.user_followers_size;

          console.log("followerSize", followerSize);

          let newFollowerSize = 0;
          if (followARY && followARY.length) {
            flag = "dislike";
            var index = followMAINarray.indexOf(followARY[0]);
            if (index != -1) {
              followMAINarray.splice(index, 1);
              newFollowerSize -= 1;
            }
          } else {
            flag = "like";
            followMAINarray.push(mongoose.Types.ObjectId(req.userId));
            newFollowerSize += 1;
          }

          await User.findByIdAndUpdate(
            { _id: mongoose.Types.ObjectId(req.userId) },
            { $set: { user_followers_size: newFollowerSize } }
          );

          await User.findByIdAndUpdate(
            { _id: mongoose.Types.ObjectId(id) },
            { $set: { user_followings: followMAINarray } }
          ).then((user) => {
            // if (err) return res.reply(messages.server_error());

            if (flag == "like") {
              return res.reply(messages.successfully("User followed"));
            } else {
              return res.reply(messages.successfully("User unfollowed"));
            }
          });
        } else {
          return res.reply(messages.bad_request("User not found."));
        }
      }
    );
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error());
  }
};

module.exports = controllers;
