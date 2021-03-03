'use strict';

/**
 * Set of methods to collect and post products from streamsideorganics to southbridge-dev
 *
 * @module api/copy-box-produce
 */
require('isomorphic-fetch');
const fs = require('fs');

/**
 * Push product southbridge-dev - throttled in by promise-throttle
 * to keep requests to limit
 *
 * @param {object} opts
 * @param {string} opts.shop e.g. "SD" or "SO"
 * @param {string} opts.path e.g. "{product.id}.json"
 * @param {object} opts.product Product json
 * @returns {Promise} And finally the json representation of product then used for pushProduct
 */
const pushProduct = async ({shop, path, product}) => {
  const shop_name = `${shop}_SHOP_NAME`;
  const passwd = `${shop}_API_PASSWORD`;
  const url = `https://${_env[shop_name]}.myshopify.com/admin/api/${_env.API_VERSION}/${path}`;
  return await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': _env[passwd],
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(product)
  })
    .then(response => response.json())
    .then(json => {
      // here we could create the id map between shops so as to use boxes on dev site
      // cancel that, what I'll do is use the sync boxes code and store boxes in a test database
      if (json.product) {
        _logger.info(JSON.stringify(json.product, null, 2));
      } else {
        _logger.info(JSON.stringify(json, null, 2));
        return false;
      }
    });
};

module.exports = pushProduct;

