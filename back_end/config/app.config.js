config = {
    jwtSecret: process.env.JWT_SECRET,
    cyclecount: {
        apiKey: process.env.CYCLECOUNT_API_KEY
    }
}
module.exports = config;