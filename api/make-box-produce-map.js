'use strict';

/**
 * Set of methods to collect and post products from streamsideorganics to southbridge-dev
 *
 * @module api/copy-box-produce
 */

/**
 * Collect products from streamside to make a id map to southbridge-dev products
 *
 * 1. Collect product ids matching "Box Produce"
 * 2. Collate array of Promises for promise-throttle (limit to 5 requests per second)
 * 3. Send the products to browser (kinda pointless excercise)
 * 4. Collect result as array of data to post to soutbridge-dev
 */
const makeProductMap = async function (req, res, next) {
  res.status(200).json({nothing: true});
};

module.exports = makeProductMap;

