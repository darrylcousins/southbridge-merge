'use strict';

/**
 * Set of methods to collect and post products from streamsideorganics to southbridge-dev
 *
 * @module api/copy-box-produce
 */
require('isomorphic-fetch');
const makeShopQuery = require('./make-query');
const PromiseThrottle = require('promise-throttle');
const fetchProduct = require("./fetch-product");
const pushProduct = require("./push-product");

/**
 * Copy products between streamsideorganics and southbridge-dev
 *
 * 1. Collect product ids matching "Box Produce"
 * 2. Collate array of Promises for promise-throttle (limit to 5 requests per second)
 * 3. Send the products to browser (kinda pointless excercise)
 * 4. Collect result as array of data to post to soutbridge-dev
 */
const copyBoxProduce = async function (req, res, next) {
  if (!req.query.type) {
    res.status(400).json({error: "No product type supplied. Try ?type=Box Produce or ?type=Container Box"});
    return
  }
  try {
    const shop = "SO";
    const path = "products.json";
    const fields = ["id", "title"];
    const query = [
      ["product_type", req.query.type]
    ];
    const limit = 150;
    const productRequests = [];
    await makeShopQuery({shop, path, limit, query, fields})
      .then(result => {
        const promiseThrottle = new PromiseThrottle({
          requestsPerSecond: 3,
          promiseImplementation: Promise
        });
        result.products.forEach((el) => {
          const regex = new RegExp("^- ?");
          if (!regex.test(el.title)) {
            productRequests.push(promiseThrottle.add(
              fetchProduct.bind(this, {
                shop: shop,
                path: `products/${el.id}.json`,
                send: true
              })
            ));
          };
        });
        Promise.all(productRequests).then(values => {
          const pushPromiseThrottle = new PromiseThrottle({
            requestsPerSecond: 2,
            promiseImplementation: Promise
          });
          const productPushes = [];
          values.forEach((el, idx) => {
            if (el.product) {
              productPushes.push(pushPromiseThrottle.add(
                pushProduct.bind(this, {
                  shop: "SD",
                  product: el,
                  path: "products.json"
                }))
              );
            }
          });
          Promise.all(productPushes).then(values => {
            _logger.info(`Pushed ${values.length} products to southbridge-dev`);
          });
        });
        res.status(200).json(result);
      })
      .catch(error => res.status(400).json({error}));

  } catch(e) {
    res.status(400).json({ error: e.toString() });
  };
};

module.exports = copyBoxProduce;
