// local utils
global.__basedir = require('app-root-path');
global.utils = require('./common/utils');
global.config = require('./common/config');

// npm packages
const cors = require('cors');
const bodyParser = require('body-parser');
const CT = require('ctvault');
const express = require('express');
const _ = require('lodash')

const serviceLoader = require('./common/serviceloader');

// express app setup
const app = express();
const port = config.get('port') || 3001;

let commonHandlers = require('./common/common_handlers')

let headers = { 
  "Strict-Transport-Security": "max-age=31536000", 
  "X-XSS-Protection": "1; mode=block", 
  "X-Content-Type-Options": "nosniff", 
  "X-Frame-Options": "DENY", 
  "Referrer-Policy": "same-origin", 
  "Content-Security-Policy": "\
    default-src 'self'; \
    script-src 'self' * 'unsafe-inline' 'unsafe-eval'; \
    connect-src 'self' *; \
    img-src * data:; \
    style-src 'self' * blob: 'unsafe-inline'; \
    font-src 'self' * data:; \
    upgrade-insecure-requests"
}

module.exports = async servicesDir => {
  app.listen(port, async () => {
    app.use('/api', bodyParser.text({ type: 'text/plain' }));
    app.use('/api', bodyParser.json());

    // use the ctvault header middleware
    app.use('/api', CT.middleware.headers);

    // CORS support
    app.use(cors());

    app.use((req, res, next) => {
      // res.header('Content-Security-Policy', 'script-src ctp.ngrok.io \'unsafe-inline\'; connect-src ctp.ngrok.io mc.commercetools.co mc-api.commercetools.co')
      // res.header('Access-Control-Allow-Origin', '*')
      _.each(Object.keys(headers), key => {
        let value = headers[key]
        res.header(key, value)
      })
      next()
    })

    // log each HTTP request
    app.use((req, res, next) => {
      if (req.path.indexOf('socket.io') === -1) {
        commonHandlers.log(req, res, next)
      }
      else {
        next()
      }
    });

    // load the UI
    app.use('/ui', express.static(`${__dirname}/common/ui`));

    // load the services
    app.use(await serviceLoader(servicesDir))

    // global error handler
    app.use(commonHandlers.error);

    logger.info(`Server started on port: ${port}`);
    logger.info(`Application directory: ${__basedir}`)
  });
}