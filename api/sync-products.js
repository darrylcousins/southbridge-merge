'use strict';
/**
 * Routine to collect box products from streamsideorganics.myshopify and store on mongo db
 * When storing on southbridge database replace ids with those on soutbridge-dev.myshopify.com
 *
 * Though I haven't done so yet, I believe that this should all run fine after
 * deleting all products from southbridge shop and db.products
 *
 *
 * @module api/sync-products
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

require('dotenv').config();
require('isomorphic-fetch');
const PromiseThrottle = require('promise-throttle');
const makeShopQuery = require('./make-query');
const fetchProduct = require("./fetch-product");
const pushProduct = require("./push-product");

const mongoInsert = async (collection, data) => {
  const { _id, ...parts } = data;
  return await collection.updateOne(
    { _id },
    { $set: { ...parts } },
    { upsert: true }
  );
};

const getOrCreateSouthbridgeProduct = async ({product, collection}) => {
  const title = product.title.replace(/^ ?- ?/, "");
  const shop = "SD";
  const path = "products.json";
  const fields = ["id", "title", "handle", "variants"];
  const limit = 3;
  const query = [
    ["title", title]
  ];

  const makeDoc = (product) => {
    return {
      _id: product.id,
      shopify_title: product.title,
      shopify_handle: product.handle,
      shopify_product_id: product.id,
      shopify_variant_id: product.variants[0].id,
      shopify_price: parseFloat(product.variants[0].price) * 100
    }
  };

  return await makeShopQuery({shop, path, limit, query, fields})
    .then(async ({products}) => {
      if (products.length === 0) {
        // need to create the product (look at copyProduct and pushProduct)
        const res = await pushProduct({
            shop: "SD",
            product: { product },
            path: "products.json"
          }).then(res => res);
        return await mongoInsert(collection, makeDoc(res));
      } else {
        return await mongoInsert(collection, makeDoc(products[0]));
      }
    });
};

const syncBoxProducts = async function (req, res, next) {
  const collection = req.app.locals.productCollection;
  try {
    const shop = "SO";
    const path = "products.json";
    const fields = ["id", "title", "handle", "variants"];
    const query = [
      ["product_type", "Box Produce"]
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
          const southbridgeRequests = [];
          values.forEach(({product}) => {
            southbridgeRequests.push(promiseThrottle.add(
              getOrCreateSouthbridgeProduct.bind(this, {
                product,
                collection
              })
            ));
          });
          Promise.all(southbridgeRequests).then(values => {
            Promise.all(values).then(result => {
              /*
              res.status(200).json(values);
              */
              res.status(200).json(values.map(el => {
                const {ok, upsertedId, matchedCount} = el;
                return {
                  ok: ok,
                  matchedCount,
                  upsertedId: upsertedId !== null ? upsertedId["_id"] : upsertedId,
                };
              }));
            });
          });
        });
      })
      .catch(error => res.status(400).json({error}));

  } catch(e) {
    res.status(400).json({ error: e.toString() });
  };
};

module.exports = syncBoxProducts;
