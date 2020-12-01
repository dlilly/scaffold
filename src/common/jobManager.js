const PubSub = require('pubsub-js')
const _ = require('lodash')
const CT = require('ctvault')
const faker = require('faker')

let jobs = {}

let scheduledJobPayload = value => ({
    container: 'config',
    key: 'scheduled-jobs',
    value
})

let processScheduledJob = fn => async (message, object) => {
    let subscriptionObject = await object.ct.customObjects.ensure(scheduledJobPayload([]))
    subscriptionObject = fn(subscriptionObject, object)
    return await object.ct.customObjects.create(scheduledJobPayload(subscriptionObject))
}

PubSub.subscribe('register-scheduled-job', processScheduledJob((subscriptionObject, { body, ct }) => {
    subscriptionObject.push(body.job)
    jobs[body.job].projects.push(ct)
    return subscriptionObject
}))

PubSub.subscribe('delete-scheduled-job', processScheduledJob((subscriptionObject, { ct, query }) => {
    _.remove(subscriptionObject, o => o === query.key)
    _.remove(jobs[query.key].projects, project => project.projectKey === ct.projectKey)
    return subscriptionObject
}))

let scheduleJob = (jobName, ct) => {
    logger.debug(`schedule [ ${jobName} ] on project [ ${ct.projectKey} ]`)
    jobs[jobName].projects.push(ct)
}

module.exports = {
    addJob: job => {
        job.projects = job.projects || []
        job.getProjects = () => job.projects
        jobs[job.key] = {
            ...job,
            run: async () => {
                logger.info(`Starting job [ ${job.key} ]...`)
                return await Promise.all(job.getProjects().map(async ct => {
                    job.id = faker.random.alphaNumeric(8)
                    logger.info(`[ ${job.id} ] Running job [ ${job.key} ] on project [ ${ct.projectKey} ]`)
                    return await job.job(ct, job.id)
                }))
            }
        }
    },
    start: async () => {
        let clients = await CT.getClients()
        await Promise.all(clients.map(async ct => {
            if (!ct.expired) {
                let scheduledJobs = await ct.customObjects.get({
                    container: "config",
                    key: "scheduled-jobs"
                }) || []
                _.each(scheduledJobs, jobName => scheduleJob(jobName, ct))
            }    
        }))

        _.each(_.values(jobs), job => {
            setInterval(job.run, job.frequency)
            job.run()
        })
    }
}