'use strict';

/**
 * Set of methods to collect and post products from streamsideorganics to southbridge-dev
 *
 * @module api/copy-box-produce
 */
require('isomorphic-fetch');
const sendProduct = require('./send-product');

/**
 * Fetch product by id from streamsideorganics - throttled in by promise-throttle
 * to keep requests to limit
 *
 * @param {object} opts
 * @param {string} opts.shop e.g. "SD" or "SO"
 * @param {string} opts.path e.g. "{product.id}.json"
 * @returns {Promise} And finally the json representation of product then used for pushProduct
 */
const fetchProduct = async ({shop, path, send}) => {
  const shop_name = `${shop}_SHOP_NAME`;
  const passwd = `${shop}_API_PASSWORD`;
  const url = `https://${_env[shop_name]}.myshopify.com/admin/api/${_env.API_VERSION}/${path}`;
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': _env[passwd] 
    }
  })
    .then(response => response.json())
    .then(json => {
      if (json.product) {
        if (send) sendProduct(json.product);
        const {title, body_html, vendor, product_type, status, image, variants} = json.product;
        const {option1, price, inventory_management, inventory_policy} = variants[0];
        let {sku} = variants[0];
        let images;
        if (image) images = [{src: image.src}];
        if (!sku) sku = title.replace(/\W/g, "").slice(0, 20);
        return {
          product: {
            title, body_html, vendor, product_type, status, images,
            variants: [{option1, price, sku, inventory_management, inventory_policy, inventory_quantity: "1000"}],
            collection: { title, id: json.product.id, variant_id: variants[0].id} 
          }
        };
      } else {
        _logger.info(JSON.stringify(json, null, 2));
        return false;
      }
    });
};

module.exports = fetchProduct;
