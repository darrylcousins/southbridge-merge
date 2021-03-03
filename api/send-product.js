'use strict';

/**
 * Simple module that send product to browser over websocket
 *
 * @module api/send-produce
 */

/**
 * Send data to client via global websocket
 */
const sendProduct = (product) => {
  _ws.clients.forEach(client => {
    const data = {
      product
    };
    client.send(JSON.stringify(data));
  });
};

module.exports = sendProduct;
