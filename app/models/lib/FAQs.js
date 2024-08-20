const mongoose = require("mongoose");

const FAQsSchema = mongoose.Schema(
    {
        oFAQs_data: {
            sQuestion: String,
            sAnswer: String
        },
        sOrder:Number
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("FAQs", FAQsSchema);
