const _ = require('lodash')
const locale = require('locale-code')
const pathresolver = require('path')
let localPath = require('path').dirname(require.main.filename)
const CT = require('ctvault')

module.exports = () => {
    let compareModel = opts => ct => async model => {
        let dataModel = await ct[opts.typeKey].ensure(model)
        let newDataModel = model
    
        let dmKeys = _.map(dataModel[pluralize(opts.attributeKey)], 'name')
        let ndmKeys = _.map(newDataModel[pluralize(opts.attributeKey)], 'name')
    
        let addActions = _.map(_.difference(ndmKeys, dmKeys), key => {
            let action = {
                action: `add${opts.actionKey}`,
            }
            action[opts.attributeKey] = _.find(
                newDataModel[pluralize(opts.attributeKey)],
                fd => fd.name === key
            )
            return action
        })
    
        let removeActions = _.map(_.difference(dmKeys, ndmKeys), key => {
            let action = {
                action: `remove${opts.actionKey}`,
            }
            action[opts.fieldKey] = key
            return action
        })
    
        let actions = _.concat(addActions, removeActions)
        if (actions.length > 0) {
            await ct[opts.typeKey].update(dataModel, actions)
    
            if (addActions.length > 0) {
                logger.info(
                    `Data model [ ${
                        model.key
                    } ] updated: added fields [ ${_.difference(
                        ndmKeys,
                        dmKeys
                    )} ] for project [ ${ct.projectKey} ]`
                )
            }
            if (removeActions.length > 0) {
                logger.info(
                    `Data model [ ${
                        model.key
                    } ] updated: removed fields [ ${_.difference(
                        dmKeys,
                        ndmKeys
                    )} ] for project [ ${ct.projectKey} ]`
                )
            }
        } else {
            logger.info(
                `Data model [ ${model.key} ] up to date for project [ ${ct.projectKey} ]`
            )
        }
    }
    
    let compareDataModel = compareModel({
        typeKey: 'types',
        attributeKey: 'fieldDefinition',
        actionKey: 'FieldDefinition',
        fieldKey: 'fieldName',
    })
    
    let compareProductDataModel = compareModel({
        typeKey: 'productTypes',
        attributeKey: 'attribute',
        actionKey: 'AttributeDefinition',
        fieldKey: 'name',
    })
    
    let compareDataModels = async (ct, service) =>
        await Promise.all(Object.values(service.model.types || {}).map(await compareDataModel(ct)))
    
    let compareProductDataModels = async (ct, service) =>
        await Promise.all(
            Object.values(service.model.productTypes || {}).map(
                await compareProductDataModel(ct)
            )
        )
    
    let handleExtension = async (obj, service) => {
        // this needs testing
        // await Promise.all((await CT.getClients()).map(async ct => {
        //     await compareDataModels(ct, service)
        //     await compareProductDataModels(ct, service)
        // }))
    
        router.addRoute(obj)
        router.post(obj.path, async (req, res, next) => {
            let h = _.get(obj, `triggers.${req.body.resource.typeId}.${req.body.action}`)
            if (h) {
                let actions = await h(req, res, next)
                if (!res.headersSent) {
                    return res.status(200).json({ actions: _.filter(actions, x => x) })
                }
            } else {
                next({
                    error: `Handler not found for ${req.body.resource.typeId} / ${req.body.action} under path ${req.path}`,
                })
            }
        })
    }
    
    let handleMicroservice = obj => {
        router.addRoute(obj)

        let paths = Array.isArray(obj.path) ? obj.path : [obj.path]
        _.each(paths, path => {
            let method = obj.method || 'get'
            router[method](path, async (req, res, next) => {
                try {
                    let response = await obj.handle(req, res, next)
                    if (!res.headersSent) {
                        res.status(200).json(response)
                    }
                } catch (error) {
                    next(error)
                }
            })
        })
    }
    
    let handleMerchantCenterExtension = obj => {
        router.use(`/`, express.static(`${localPath}/${obj.localPath}`))
        router.use(`/:projectKey/${obj.name}`, (req, res) => res.sendFile(pathresolver.resolve(`${localPath}/${obj.localPath}/index.html`)))
    }
    
    let handleStorefront = obj => {
        router.use('/:country/:language/*', (req, res, next) => {
            let path = `${localPath}/${obj.localPath}`
            if (locale.validateLanguageCode(`${req.params.language}-${req.params.country}`)) {
                return res.sendFile(pathresolver.resolve(`${path}/index.html`))
            }
            else {
                next()
            }
        })
        router.use('/', async (req, res, next) => {
            let path = `${localPath}/${obj.localPath}`
    
            if (req.path === '/') {
                res.redirect('/US/en/')
            }
            else {
                let l = pathresolver.resolve(`${path}${req.path}`)
                if (fs.existsSync(l)) {
                    return res.sendFile(l)
                }
                else {
                    next()
                }    
            }
        })
    }
    
    let handleUI = obj => router.use(obj.path, express.static(`${localPath}/${obj.localPath}`))
    
    let handle = obj => {
    
    }
    
    return {
        handleExtension,
        handleMicroservice,
        handleMerchantCenterExtension,
        handleStorefront,
        handleUI,
        handle
    }
}