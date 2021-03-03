'use strict';

require('dotenv').config();
require('isomorphic-fetch');
const {
  mongoInsert
} = require('./order-lib');
const Pool = require('pg').Pool;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * if I don't get a product back for the title then I need to create the product
 * somewhere here is a method called push-product
 */
const getSouthbridgeProduct = async (title) => {
  // update tags with comma separated string
  const shop_name = `OD_SHOP_NAME`;
  const passwd = `OD_API_PASSWORD`;
  const url = `https://${_env[shop_name]}.myshopify.com/admin/api/${_env.API_VERSION}/${path}`;
  // all of these for container box, skip sku for box produce
  const fields = [
    'handle',
    'price',
    'product_id',
    'variant_id',
    'sku',
    'price',
  ];
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': _env[passwd] 
    }
  })
    .then(response => response.json())
    .then(data => data);
};

const getBoxSKU = async (id) => {
  const shop_name = "SO_SHOP_NAME";
  const passwd = "SO_API_PASSWORD";
  const url = `https://${_env[shop_name]}.myshopify.com/admin/api/${_env.API_VERSION}/variants/${id}.json?fields=sku`;
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': _env[passwd] 
    }
  })
    .then(response => response.json())
    .then(data => data);
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

const collectBoxes = async () => {
  // Collect current boxes and push into mongodb
  let boxDocuments = [];
  await pool
    .query(currentBoxes)
    .then(res => {
      res.rows.forEach(async (row) => {
        let boxDoc = row;
        let boxId = boxDoc.id;
        delete boxDoc.id;
        // figure out the unique doc identifier: timestamp in days + shopify_product_id
        boxDoc._id = parseInt(boxDoc.delivered.getTime()/(1000 * 60 * 60 * 24) + parseInt(boxDoc.shopify_product_id));
        boxDoc.delivered = boxDoc.delivered.toDateString();

        // here I need to make a request to soutbridge-dev.myshopify.com and find the correct:
        // id, handle, and variant_id; the title will be my search term and price will be fine

        boxDoc.shopify_product_id = parseInt(boxDoc.shopify_product_id);
        boxDoc.shopify_variant_id = parseInt(boxDoc.shopify_variant_id);

        // get box products
        pool
          .query(boxProducts, [boxId, 't'])
          .then(res => {
            boxDoc.addOnProducts = res.rows.map(el => ({...el}));
            // same here - query soutbridge-dev.myshopify.com for
            // id, handle, and variant_id
            // and don't forget to parseInt the id's
            pool
              .query(boxProducts, [boxId, 'f'])
              .then(res => {
                // for each product I need to query southbridge dev for the match and if not found create it
                boxDoc.includedProducts = res.rows.map(el => ({...el}));
              });
          });
        boxDocuments.push(boxDoc);

        // Can convert _id back to the date
        //let milliseconds = parseInt(boxDoc._id.slice(0, 5)) * 1000 * 60 * 60 * 24;
        //console.log(new Date(milliseconds));
      });
    });
  return boxDocuments;
};

const addSKUAndSave = async (boxDocuments, collection) => {
  const final = await boxDocuments.map(async (boxDoc) => {
    const variant = await getBoxSKU(boxDoc.shopify_variant_id.toString())
      .then(res => res.variant.sku);
    boxDoc.shopify_sku = variant;
    console.log(boxDoc);
    await mongoInsert(boxDoc, collection);
    return boxDoc;
  });
  return final;
};

/**
 * @exports syncBoxes
 */
module.exports = async function (req, res, next) {
  const boxDocuments = await collectBoxes();
  const collection = req.app.locals.boxCollection;
  boxDocuments.forEach(async (boxDoc) => {
    const variant = await getBoxSKU(boxDoc.shopify_variant_id.toString())
      .then(res => res.variant.sku);
    boxDoc.shopify_sku = variant;
    //console.log(boxDoc);
    const { _id, ...parts } = boxDoc;
    const res = await collection.updateOne(
      { _id },
      { $setOnInsert: { ...parts } },
      { upsert: true }
    );
    if (res.upsertId) {
      _logger.info(`Inserted box with id: ${res.upsertedId._id}`);
    } else {
      _logger.info(`No box to insert, existing box with _id: ${_id}`);
    }
  });

  res.status(200).json({ success: true });
};
