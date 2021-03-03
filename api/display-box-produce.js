'use strict';

/**
 * Simple module that send product to browser over websocket
 *
 * @module api/send-produce
 */
const fs = require("fs");
const PromiseThrottle = require('promise-throttle');
const fetchProduct = require("./fetch-product");
const makeShopQuery = require('./make-query');

/**
 * Copy products between streamsideorganics and southbridge-dev
 *
 * 1. Collect product ids matching "Box Produce"
 * 2. Collate array of Promises for promise-throttle (limit to 5 requests per second)
 * 3. Send the products to browser (kinda pointless excercise)
 */
const displayBoxProduce = async function (req, res, next) {
  if (!req.query.type) {
    res.status(400).json({error: "No product type supplied. Try ?type=Box Produce or ?type=Container Box"});
    return
  }
  try {
    const shop = "SD";
    const path = "products.json";
    const fields = ["id", "title"];
    const query = [
      ["product_type", req.query.type]
    ];
    const product_type = req.query.type.replace(/ /g, '-').toLowerCase();
    _logger.info(product_type);
    const limit = 150;
    await makeShopQuery({shop, path, limit, query, fields})
      .then(result => {
        const promiseThrottle = new PromiseThrottle({
          requestsPerSecond: 3,
          promiseImplementation: Promise
        });
        const productRequests = [];
        result.products.forEach((el) => {
          const regex = new RegExp("^- ?");
          if (!regex.test(el.title)) {
            productRequests.push(promiseThrottle.add(
              fetchProduct.bind(this, {
                shop: shop,
                path: `products/${el.id}.json`,
                send: true // send data over websocket
              })
            ));
          };
        });
        Promise.all(productRequests).then(values => {
          _logger.info(values.length);
          const collections = values.map(el => el.product.collection);
          _logger.info(JSON.stringify(collections, null, 2));
          _logger.info(process.cwd());
          fs.writeFile(`southbridge-${product_type}.json`, JSON.stringify(collections, null, 2), (err) => {
            if (err) {
              _logger.warn(err);
              throw err;
            };
            _logger.info(`Collection => streamside-${product_type}.json`);
          });
        });
        res.status(200).json(result);
      })
      .catch(error => res.status(400).json({error}));

  } catch(e) {
    res.status(400).json(JSON.stringify(e));
  };
};

module.exports = displayBoxProduce;
