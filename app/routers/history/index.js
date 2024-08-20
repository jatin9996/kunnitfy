const router = require("express").Router();
const historyController = require("./lib/controllers");
const historyMiddleware = require("./lib/middleware");

router.post("/insert", historyMiddleware.verifyWithoutToken, historyController.insertHistory);
router.post("/fetchHistory",historyMiddleware.verifyWithoutToken,historyController.fetchHistory);

module.exports = router;