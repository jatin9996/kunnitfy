/* eslint-disable no-var */
/* eslint-disable no-use-before-define */
require("dotenv").config();
process.env.NODE_ENV = process.env.NODE_ENV || "dev";
process.env.HOST = process.env.HOST || "127.0.0.1";
process.env.PORT = 3000;

process.env.NETWORK_RPC_URL =
  process.env.NETWORK_RPC_URL ||
  "https://data-seed-prebsc-1-s1.binance.org:8545";

const oEnv = {};

oEnv.dev = {
  BASE_URL: process.env.URL,
  BASE_API_PATH: "",
  DB_URL: process.env.DB_URL,
};

oEnv.stag = {
  BASE_URL: "",
  BASE_API_PATH: "",
  DB_URL: "",
};

oEnv.prod = {
  BASE_URL: "",
  BASE_API_PATH: "",
  DB_URL: "",
};

oEnv.test = {
  BASE_URL: "127.0.0.1",
  BASE_API_PATH: "",
  DB_URL:
    "mongodb+srv://Mohammad:Mohammad@cluster0.qiwzugo.mongodb.net/TestCollection?retryWrites=true&w=majority",
};
process.env.BASE_URL = oEnv[process.env.NODE_ENV].BASE_URL;
process.env.BASE_API_PATH = oEnv[process.env.NODE_ENV].BASE_API_PATH;
process.env.JWT_SECRET = "jwt-secret";
process.env.DB_URL = oEnv[process.env.NODE_ENV].DB_URL;

process.env.OTP_VALIDITY = 60 * 1000;
process.env.SUPPORT_EMAIL = "";
process.env.AWS_ACCESSKEYID = "";
process.env.AWS_SECRETKEY = "";

process.env.ROUNDSMS_API_KEY = "";

process.env.AWS_REGION = "";

process.env.SMTP_HOST = "smtp.gmail.com" || "smtp.sendgrid.net";
process.env.SMTP_PORT = 465;
process.env.SMTP_USERNAME = process.env.SMTP_USERNAME || "example@gmail.com"; // SMTP email
process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD || "example@123"; // Your password

process.env.PINATAAPIKEY = process.env.PINATAAPIKEY;
process.env.PINATASECRETAPIKEY = process.env.PINATASECRETAPIKEY;



// # CreatorV1 proxy deployed at: 0x7932f5F04F96ea09CD2A50F5316058d662d4Cbe5
// # CreatorV1 implementation deployed at: 0xE0e360e510D26450377131Af7769E72892C86034
// # Initializing implementation contract. Signer is: 0xad4d8484B7F6944985F761F1f752027FdD06AEd6
// # Deploying Marketplace proxy
// # Marketplace proxy deployed at: 0x4ce659B2408641D5A1D700990d7DfB0Df82DdD9d
// # Marketplace implementation deployed at: 0xc2bE4AA6aff350ECaFa9a093CD222081CBAEE1EF