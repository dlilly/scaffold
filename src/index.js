// npm packages
const cors = require('cors');
const bodyParser = require('body-parser');
const CT = require('ctvault');
const express = require('express');
const _ = require('lodash')

let headers = { 
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
  // local utils
  global.__basedir = require('app-root-path');
  global.__appdir = `${servicesDir}/..`

  global.utils = require('./common/utils');
  global.config = require('./common/config');

  // express app setup
  const app = express();
  const port = config.get('port') || 3001;

  let commonHandlers = require('./common/common_handlers')

  app.listen(port, async () => {
    app.use(bodyParser.text({ type: 'text/plain' }));
    app.use(bodyParser.json());

    // CORS support
    app.use(cors());

    app.use((req, res, next) => {
      _.each(Object.keys(headers), key => {
        let value = headers[key]
        res.header(key, value)
      })
      next()
    })

    // use the ctvault header middleware
    app.use(CT.middleware.headers);

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
    app.use(await require('./common/serviceloader')(servicesDir, app))

    // global error handler
    app.use(commonHandlers.error);

    logger.info(`Server started on port: ${port}`);
    logger.info(`Application directory: ${__basedir}`)
  });
}