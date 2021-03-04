'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan'); // http request logger
const winston = require('./winston-config'); // logger
const WebSocket = require('ws');
const MongoClient = require('mongodb').MongoClient;
const api = require("./api");

global._logger = winston;
global._env = process.env;

module.exports = function startServer(PORT, PATH, callback) {
  const app = express();
  const server = http.createServer(app);

  //initialize the WebSocket server instance
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {

    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
      //log the received message and send it back to the client
      ws.send(`Hello, you sent -> ${message}`);
    });

    //send immediatly a feedback to the incoming connection    
    ws.send('Websocket connected');
  });

  global._ws = wss;

  // create mongo client connection
  let dbClient;
  let boxCollection;
  const mongo_uri = 'mongodb://localhost';

  // assign the client from MongoClient
  MongoClient
    .connect(mongo_uri, { useNewUrlParser: true, poolSize: 10, useUnifiedTopology: true })
    .then(client => {
      const db = client.db('southbridge');
      dbClient = client;
      const productCollection = db.collection('products');
      const boxCollection = db.collection('boxes');
      const containerCollection = db.collection('containers');

      // make collection available globally
      app.locals.boxCollection = boxCollection;
      app.locals.productCollection = productCollection;
      app.locals.containerCollection = containerCollection;

      // listen for the signal interruption (ctrl-c)
      process.on('SIGINT', () => {
        console.log('\nclosing dbClient');
        dbClient.close();
        process.exit();
      });

    })
    .catch(error => console.error(error));

  app.use(bodyParser.urlencoded({ extended: true }));

  // logging
  app.use(morgan('dev', { stream: winston.stream })); // simple

  app.use('/api', api.routes);

  // brunch compiled static files
  app.use(express.static(path.join(__dirname, PATH)));

  // templating
  app.set('view engine', 'ejs');

  // logging
  app.use(morgan('dev', { stream: winston.stream })); // simple

  const useCrank = (req, res, next) => {
    //if (!req.user) return res.redirect('/login');
    res.render('pages/index',
      (err, html) => {
        if (err) next(err);
        res.send(html);
      }
    )
  };

  app.get('/', useCrank);

  // render 404 page
  app.use(function (req, res, next) {
    res.status(404).render('pages/notfound',
      (err, html) => {
        if (err) next(err);
        res.send(html);
      }
    )
  })

  // error handler https://www.digitalocean.com/community/tutorials/how-to-use-winston-to-log-node-js-applications
  app.use(function(err, req, res, next) {
    _logger.info('error', err);
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page - see above code for 404 to render a view
    res.locals.status = err.status || 500;
    res.status(res.locals.status);
    res.render('pages/error');
  });

  server.listen(PORT, () => {
    _logger.info(`Server started on port ${server.address().port}`);
    callback();
  });
};
