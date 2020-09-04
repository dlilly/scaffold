module.exports = {
    error: (err, req, res, next) => {
        if (res.headersSent) {
            return next(err);
        }

        if (err.message) {
            res.status(500).send(err.message)
        }
        else {
            res.status(500).json(err);
        }
    },

    log: (req, res, next) => {
        if (req.path.indexOf('/api/isready') === -1) {
            logger.debug(`${req.method} ${req.path}`);
        }
        next();
    }
}