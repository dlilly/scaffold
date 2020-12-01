const express = require('express')
global.router = express.Router()

const fs = require('fs-extra')
const _ = require('lodash')

// FIX ME
const CT = require('ctvault');
const pluralize = require('pluralize')
const utils = require('./utils')

const logger = require('/Users/dave/work/ctvault/lib/logger');

const jobManager = require('./jobManager');

let services = []

router.routes = {}
router.addRoute = obj => router.routes[obj.key] = obj

const serviceHandlers = require('./servicehandlers')();

let loadDir = async dir => {
    const subscriberManager = require('./subscriptionManager')
    logger.debug(`\tLoading services subdirectory at ${dir}`)

    const jobManager = require('./jobManager')

    let service = require(dir)
    service.key = _.last(dir.split('/'))
    // services.push(service)

    service.asyncInit && await service.asyncInit()

    _.each(service.extensions, serviceHandlers.handleExtension)
    _.each(service.microservices, serviceHandlers.handleMicroservice)
    _.each(service.admin_microservices, serviceHandlers.handleMicroservice)
    _.each(service.scheduled_jobs, jobManager.addJob)
    _.each(service.subscriptions, subscriberManager.subscribe)
    _.each(service.ui, serviceHandlers.handleUI)
    _.each(service.storefront, serviceHandlers.handleStorefront)
    _.each(service.mc, serviceHandlers.handleMerchantCenterExtension)
}

module.exports = async (serviceDir, app) => {
    logger.debug(`Loading services directory at ${serviceDir}`)
    if (fs.existsSync(serviceDir)) {    
        await Promise.all(utils.file.getSubdirectories(serviceDir).map(loadDir))

        let graphqlServices = _.filter(services, 'typeDefs')
        if (graphqlServices.length > 0) {
            const { ApolloServer } = require('apollo-server-express');
            const { buildFederatedSchema } = require('@apollo/federation');

            const server = new ApolloServer({
                schema: buildFederatedSchema(_.map(graphqlServices, s => ({ 
                    typeDefs: s.typeDefs, 
                    resolvers: s.resolvers
                }))),
                context: ({ req }) => ({ ct: req.ct })  
                // dataSources: () => ({ CompanyApi: new Company({ url: companyMsUrl }) })
            });
            server.applyMiddleware({ app })
        }
    }

    // load the common services directory
    await loadDir('./services')

    await jobManager.start()

    // load the /api route
    router.get('/api', (req, res) => res.json(Object.values(router.routes)))
    router.use('/docs', express.static(`${__dirname}/../../docs`))
    return router
}
