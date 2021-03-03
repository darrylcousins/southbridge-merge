'use strict';

require('isomorphic-fetch');
const routes = require('express').Router();
const copyBoxProduce = require("./copy-box-produce");
const displayBoxProduce = require("./display-box-produce");
const syncBoxes = require('./sync-boxes');

routes.get('/', function (req, res) {
  res.status(404).send('No index for the api');
})

routes.get('/copy-box-produce', copyBoxProduce);
routes.get('/display-box-produce', displayBoxProduce);
routes.get('/sync-boxes', syncBoxes);


module.exports = routes;
