const http = require("http");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const routes = require("./routes");
const htmlRender = require("./render");
var cookieParser = require("cookie-parser");
// const fileUpload = require('express-fileupload');

const ipfsUploadRouter = require('./routers/ipfs/ipfsupload');

function Router() {
  this.app = express();
  this.httpServer = http.createServer(this.app);
  this.app.use(cookieParser());
  let allowedDomains = process.env.ALLOWED_DOMAINS;
  if (allowedDomains === "" || allowedDomains === undefined) {
    allowedDomains = ["*"];
  } else {
    allowedDomains = allowedDomains.split(",");
  }
  this.corsOptions = {
    origin: allowedDomains,
    methods: ["*"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
  this.app.use(
    cors({
      credentials: true,
      origin: true,
      // Set the browser cache time for preflight responses
      maxAge: 86400,
      preflightContinue: false, // Allow us to manually add to preflights
    })
  );

  this.app.use(function (req, res, next) {
    let allowedDomains = process.env.ALLOWED_DOMAINS;
    if (allowedDomains === "" || allowedDomains === undefined) {
      allowedDomains = ["*"];
    } else {
      allowedDomains = allowedDomains.split(",");
    }

    var origin = req.headers.origin;
    if (allowedDomains.indexOf(origin) > -1) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "X-Requested-With,content-type, Accept"
    );
    res.header("Access-Control-Allow-Credentials", true);
    // res.header("Cache-Control", "public, max-age=86400");

    // const cookie = req.headers.cookie;
    // let sessionId;
    // if (cookie) {
    //   const parts = cookie.split('=');
    //   sessionId = parts[1];
    // }

    // // Check if the session is valid
    // let session;
    // if (sessionId) {
    //   session = sessions[sessionId];
    //   if (session && session.expires > new Date()) {
    //     session.expires = new Date(Date.now() + 60 * 60 * 1000);
    //   } else {
    //     delete sessions[sessionId];
    //     session = null;
    //     sessionId = null;
    //   }
    // }

    next();
  });

  this.app.use(bodyParser.json());
  this.app.use(bodyParser.urlencoded({ extended: true }));
  //  this.app.use(fileUpload());
}

Router.prototype.initialize = function () {
  this.setupMiddleware();
  this.setupServer();
};

Router.prototype.setupMiddleware = function () {
  this.app.disable("etag");
  this.app.enable("trust proxy");
  this.app.use(cors(this.corsOptions));
  this.app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: true,
      saveUninitialized: true,
    })
  );
  // this.app.use(helmet());
  this.app.use(compression());
  this.app.engine("html", require("ejs").renderFile);
  this.app.use(bodyParser.json({ limit: "16mb" }));
  this.app.use(
    bodyParser.urlencoded({
      limit: "16mb",
      extended: true,
      parameterLimit: 50000,
    })
  );
  this.app.set("views", "./seeds");
  this.app.set("view engine", "ejs");
  // if (process.env.NODE_ENV !== 'prod') this.app.use(morgan('dev', { skip: (req) => req.path === '/ping' || req.path === '/favicon.ico' }));
  this.app.use(express.static("./seeds"));
  this.app.use(this.routeConfig);
  this.app.use("/api/v1", routes);
  this.app.use("/", htmlRender);
  this.app.use("*", this.routeHandler);
  this.app.use(this.logErrors);
  this.app.use(this.errorHandler);
  this.app.use('/ipfs', ipfsUploadRouter);
};

Router.prototype.setupServer = function () {
  this.httpServer = http.Server(this.app);
  this.httpServer.timeout = 300000;
  console.log(process.env.SERVER_PORT);
  this.httpServer.listen(process.env.SERVER_PORT, "0.0.0.0", () =>
    console.log(`Spinning on ${process.env.SERVER_PORT}`)
  );
};
Router.prototype.routeConfig = function (req, res, next) {
  req.sRemoteAddress =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (req.path === "/ping") return res.status(200).send({});
  res.reply = (
    { statusCode, code, message },
    data = {},
    header = undefined
  ) => {
    res.status(code).header(header).json({ statusCode, message, data });
  };
  next();
};

//Router.prototype.routeConfig = function (req, res, next) {
//  req.sRemoteAddress =
//    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
//  if (req.path === "/ping") return res.status(200).send({});
//  res.reply = ({ code, message }, data = {}, header = undefined) => {
//    res.status(code).header(header).json({ message, data });
//  };
//  next();
//};

Router.prototype.routeHandler = function (req, res) {
  return res.render("Error/404");
};

Router.prototype.logErrors = function (err, req, res, next) {
  log.error(`${req.method} ${req.url}`);
  log.error("body -> ", req.body);
  log.error(err.stack);
  return next(err);
};

Router.prototype.errorHandler = function (err, req, res, next) {
  res.status(500);
  res.send({ message: err });
};

module.exports = new Router();