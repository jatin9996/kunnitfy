const mongoose = require("mongoose");
const bannerSchema = mongoose.Schema(
    {
        bDesktopFileHash: {
            type: String,
            // required: true
        },
        bMobileFileHash: {
            type: String,
            // required: true
        },
        bHeading: {
            type: String,
            // required: true
        },
        bSubHeading: { 
            type: String, 
            // required: true 
        },
        bannerURL: { 
            type: String, 
            // required: true 
        },
        collection_Name: {
            type: String,
           
        },
        nft_Name:{
            type: String,
            
        },
		order:{
			type:Number,
            default:0
		},
        // bBtnOneText: { 
        //     type: String 
        // },
        
        // bBtnOneLink: { 
        //     type: String 
        // },
        // bBtnOneClass: { 
        //     type: String 
        // },
        // bBtnTwoText: { 
        //     type: String 
        // },
        // bBtnTwoLink: { 
        //     type: String 
        // },
        // bBtnTwoClass: { 
        //     type: String 
        // },
        bCreatedOn: {
            type: Date,
            default: Date.now
        },
    }
);

module.exports = mongoose.model("Banner", bannerSchema);
