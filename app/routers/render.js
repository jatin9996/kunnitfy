const router = require('express').Router();

const userRenderRoute = require('./user_render');
const adminRenderRoute = require('./admin_render');

// router.use('/', userRenderRoute);
router.use('/a', adminRenderRoute);
// router.get('/', function(req, res, next) {
//     res.render('index', { title: 'Express' });
//   });
  

module.exports = router;
