'use strict';
/**
 * Temp routine to collect boxes from pg database and store on mongo
 * southbridge database whilst also replacing ids with southbridge-dev ids
 *
 * @module api/sync-boxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

require('dotenv').config();
require('isomorphic-fetch');
const PromiseThrottle = require('promise-throttle');
const Pool = require('pg').Pool;
const sendProduct = require('./send-product');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const mongoInsert = async (collection, data) => {
  const { _id, ...parts } = data;
  return await collection.updateOne(
    { _id },
    { $set: { ...parts } },
    { $setOnInsert: { ...parts } },
    { upsert: true }
  );
};

const currentBoxes = `
  SELECT
        "Boxes".id,
        "Boxes".delivered,
        "ShopifyBoxes".shopify_title,
        "ShopifyBoxes".shopify_handle,
        "ShopifyBoxes".shopify_product_id,
        "ShopifyBoxes".shopify_variant_id,
        "ShopifyBoxes".shopify_price
    FROM "Boxes"
    INNER JOIN "ShopifyBoxes" ON "ShopifyBoxId" = "ShopifyBoxes".id
    WHERE delivered > NOW()
    ORDER BY delivered, shopify_price
`;

const boxProducts = `
  SELECT 
        "Products".shopify_title,
        "Products".shopify_handle,
        "Products".shopify_id,
        "Products".shopify_variant_id,
        "Products".shopify_price
    FROM "BoxProducts"
    INNER JOIN "Products" ON "BoxProducts"."ProductId" = "Products".id
    WHERE "BoxProducts"."BoxId" = $1 AND "BoxProducts"."isAddOn" = $2
    ORDER BY "Products".shopify_title
`;

const collectProducts = async (boxId, addOn) => {
  // !! addOn is 't' of 'f', i.e. a string
  // get box products
  const products = await pool
    .query(boxProducts, [boxId, 't'])
    .then(res => {
      return res.rows;
    });
  return products;
};

const collectBoxes = async () => {
  // Collect current boxes and push into mongodb
  let boxDocuments = [];
  await pool
    .query(currentBoxes)
    .then(res => {
      res.rows.forEach(async (row) => {
        boxDocuments.push(row);
      });
    });
  return boxDocuments;
};

/**
 * Here a TODO, if not in collection I need a routine (see sync-products) to
 * create the product and include in database
 */
const getProductCollection = async (collection, start) => {
  const products = [];
  return start.map(async product => {
    const productDoc = await collection.findOne(
      { shopify_title: product.shopify_title },
    );
    const prodDoc = { ...productDoc };
    delete prodDoc._id;
    return prodDoc;
  })
}

module.exports = async function (req, res, next) {
  const boxDocuments = await collectBoxes();
  const collection = req.app.locals.boxCollection;
  const results = boxDocuments.map(async box => {
    const containerDoc = await req.app.locals.containerCollection.findOne(
      { shopify_title: box.shopify_title },
    );
    const boxDoc = { ...containerDoc };
    boxDoc._id = boxDoc._id + box.delivered.getTime();
    //delete boxDoc._id;
    //boxDoc._id = newId;
    boxDoc.delivered = box.delivered.toDateString();

    const addOnProducts = await collectProducts(box.id, 't');
    let products = await getProductCollection(req.app.locals.productCollection, addOnProducts);
    boxDoc.addOnProducts = await Promise.all(products);

    const includedProducts = await collectProducts(box.id, 'f');
    products = await getProductCollection(req.app.locals.productCollection, includedProducts);
    boxDoc.includedProducts = await Promise.all(products);

    return boxDoc;
    //await mongoInsert(collection, boxDoc);
    //results.push(boxDoc);
  });
  const documents = await Promise.all(results);
  const dbDocuments = await Promise.all(documents.map(async doc => {
    const res = await mongoInsert(req.app.locals.boxCollection, doc);
    //const res = await req.app.locals.boxCollection.insertOne(doc);
    return res;
  }));
  res.status(200).json(dbDocuments);
};
