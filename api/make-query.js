'use strict';

require('isomorphic-fetch');

const makeShopQuery = async ({shop, path, limit, query, fields}) => {
  // shop one of 'SO', 'SD'
  const shop_name = `${shop}_SHOP_NAME`;
  const passwd = `${shop}_API_PASSWORD`;
  const fieldString = fields ? `?fields=${fields.join(',')}` : "";
  const start = fields ? "&" : "?";
  const searchString = query ? start + query.reduce((acc, curr, idx) => {
    const [key, value] = curr;
    return acc + `${ idx > 0 ? "&" : ""}${key}=${value}`;
  }, "") : "";
  const count = limit ? `&limit=${limit}` : "";
  
  const url = `https://${_env[shop_name]}.myshopify.com/admin/api/${_env.API_VERSION}/${path}${fieldString}${searchString}${count}`;
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': _env[passwd] 
    }
  })
    .then(response => response.json())
};

module.exports = makeShopQuery;
