const PubSub = require('pubsub-js')
const _ = require('lodash')

let jobs = {}

PubSub.subscribe('register-scheduled-job', async (message, { body, ct }) => {
    let subscriptionObject = await ct.customObjects.ensure({
        container: "config",
        key: "scheduled-jobs",
        value: []
    })

    subscriptionObject.push(body.job)
    jobs[body.job].projects.push(ct)

    return await ct.customObjects.create({
        container: "config",
        key: "scheduled-jobs",
        value: subscriptionObject
    })
})

PubSub.subscribe('delete-scheduled-job', async (message, { ct, query }) => {
    let subscriptionObject = await ct.customObjects.ensure({
        container: "config",
        key: "scheduled-jobs",
        value: []
    })
    
    subscriptionObject = _.remove(subscriptionObject, o => o === query.key)
    jobs[query.key].projects = _.remove(jobs[query.key].projects, ct => ct.projectKey === query.key)
    
    return await ct.customObjects.create({
        container: "config",
        key: "scheduled-jobs",
        value: subscriptionObject
    })
})

module.exports = {
    addJob: job => {
        jobs[job.key] = job
        job.projects = []
        job.run = () => {
            _.each(job.projects, ct => {
                job.job(ct)
            })
        }
        setInterval(job.run, job.frequency)
    },
    schedule: (jobName, ct) => {
        jobs[jobName].projects.push(ct)
    }
}