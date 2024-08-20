/* eslint-disable no-undef */
const fs=require("fs");
const ipfsAPI=require("ipfs-api");
const ipfs=ipfsAPI("ipfs.infura.io","5001",{
  protocol: "https",
  auth: "21w11zfV67PHKlkAEYAZWoj2tsg:f2b73c626c9f1df9f698828420fa8439",
});
const {History}=require("../../../models");
const mongoose=require("mongoose");
const validators=require("./validators");
var jwt=require("jsonwebtoken");
const e=require("express");
const controllers={};


controllers.insertHistory=async (req,res) => {
  //console.log("req", req.body);
  try {
    let nftId=req.body.nftId;
    let userId=req.body.userId;
    let action=req.body.action;
    let actionMeta=req.body.actionMeta;
    let message=req.body.message;
    let hash=req.body.hash;

    const insertData=new History({
      nftId: nftId,
      userId: userId,
      action: action,
      actionMeta: actionMeta,
      message: message,

    });

    if(hash===""||hash===undefined) {
      insertData.hash="";
      console.log("Insert Data History is "+insertData);
      insertData.save().then(async (result) => {
        return res.reply(messages.created("Record Inserted"),result);
      }).catch((error) => {
        console.log("Error in creating Record",error);
        return res.reply(messages.error());
      });
    } else {
      insertData.hash=hash;
      await History.findOne({hash: hash},
        async (err,record) => {
          if(err) {
            console.log("Error in fetching History Records ",err)
            return res.reply(messages.error());
          }
          if(!record) {
            insertData.save().then(async (result) => {
              return res.reply(messages.created("Record Inserted"),result);
            }).catch((error) => {
              console.log("Error in creating Record",error);
              return res.reply(messages.error());
            });
          } else {
            let updateHistoryData={
              nftId: nftId,
              userId: userId,
              action: action,
              actionMeta: actionMeta,
              message: message,
              hash: hash
            }
            await History.findOneAndUpdate(
              {_id: mongoose.Types.ObjectId(record._id)},
              {$set: updateHistoryData},{new: true},function(err,updateHistory) {
                if(err) {
                  console.log("Error in Updating History"+err);
                  return res.reply(messages.error());
                } else {
                  console.log("History Updated: ",updateHistory);
                  return res.reply(messages.created("History Updated"),updateHistory);
                }
              }
            );
          }
        }
      )
    }
    //console.log("Insert Data is " +insertData);
    //insertData.save().then(async (result) => {
    //  return res.reply(messages.created("Record Inserted"),result);
    //}).catch((error) => {
    //  console.log("Error in creating Record",error);
    //  return res.reply(messages.error());
    //});
  } catch(e) {
    console.log("errr",e);
    return res.reply(messages.error());
  }
};
controllers.fetchHistory=async (req,res) => {
  //console.log("req", req.body); 
  try {
    let data=[];
    let nftId=req.body.nftId;
    let userId=req.body.userId;
    let action=req.body.action;
    let actionMeta=req.body.actionMeta;

    const page=parseInt(req.body.page);
    const limit=parseInt(req.body.limit);

    const startIndex=(page-1)*limit;
    const endIndex=page*limit;

    let onftIDQuery={};
    let ouserIDQuery={};
    let oactionQuery={};
    let oactionMetaQuery={};
    let SearchArray=[];
    let filters=[];
    if(nftId!="All") {
      onftIDQuery={nftId: mongoose.Types.ObjectId(nftId)};
      SearchArray["nftId"]=mongoose.Types.ObjectId(nftId);
    }
    if(userId!="All") {
      ouserIDQuery={userId: mongoose.Types.ObjectId(userId)};
      SearchArray["userId"]=mongoose.Types.ObjectId(userId);
    }
    if(action!="All") {
      oactionQuery={action: action};
      SearchArray["action"]=action;
    }
    if(actionMeta!="All") {
      oactionMetaQuery={actionMeta: actionMeta};
      SearchArray["actionMeta"]=actionMeta;
    }
    let SearchObj=Object.assign({},SearchArray);
    console.log(SearchObj);
    console.log(filters);
    const results={};

    if(endIndex<(await History.countDocuments(SearchObj).exec())) {
      results.next={
        page: page+1,
        limit: limit,
      };
    }

    if(startIndex>0) {
      results.previous={
        page: page-1,
        limit: limit,
      };
    }
    await History.find(SearchObj)
      .sort({sCreated: -1})
      .select({
        _id: 1,
        nftId: 1,
        userId: 1,
        action: 1,
        actionMeta: 1,
        message: 1,
        sCreated: 1
      }).limit(limit)
      .skip(startIndex)
      .lean()
      .exec()
      .then((res) => {
        data.push(res);
      })
      .catch((e) => {
        console.log("Error",e);
      });

    results.count=await History.countDocuments(SearchObj).exec();
    results.results=data;
    res.header('Access-Control-Max-Age',600);
    return res.reply(messages.success("History Details"),results);
    /*
    console.log("Datat" + data[0].history.length);
    let iFiltered = data[0].history.length;
    if (data[0].totalCount[0] == undefined) {
      return res.reply(messages.no_prefix("History Details"), {
        data: [],
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: 0,
      });
    } else {
      return res.reply(messages.no_prefix("History Details"), {
        data: data[0].history,
        draw: req.body.draw,
        recordsTotal: data[0].totalCount[0].count,
        recordsFiltered: iFiltered,
      });
    }*/
  } catch(error) {
    console.log(error);
    return res.reply(messages.server_error());
  }
};



module.exports=controllers;
