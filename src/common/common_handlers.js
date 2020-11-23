module.exports = {
    error: (err, req, res, next) => {
        if (res.headersSent) {
            return next(err);
        }

        if (err.message) {
            res.status(500).json({ message: err.message, stack: err.stack })
        }
        else {
            res.status(500).json({ message: err.message, stack: err.stack });
        }
    },

    log: (req, res, next) => {
        if (req.path.indexOf('/api/isready') === -1) {
            logger.debug(`${req.method} ${req.path}`);
        }
        next();
    }
}