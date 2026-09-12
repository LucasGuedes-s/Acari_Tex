const config = require('../config/app.config.js');

function validarApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: 'INVALID_AUTH',
            message: 'API Key ausente. Por favor, forneça o header x-api-key.'
        });
    }

    if (!config.cyclecount.apiKey) {
        console.error(
            '[CycleCount] ERRO: CYCLECOUNT_API_KEY não configurada.'
        );

        return res.status(500).json({
            error: 'CONFIGURATION_ERROR',
            message: 'API Key do CycleCount não configurada no servidor.'
        });
    }

    if (apiKey !== config.cyclecount.apiKey) {
        return res.status(401).json({
            error: 'INVALID_AUTH',
            message: 'API Key inválida.'
        });
    }

    next();
}

module.exports = validarApiKey;