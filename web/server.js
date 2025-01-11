const express = require('express');
const path = require('path');

function startWebServer(client, db) {
    const app = express();
    const port = process.env.PORT || 8000;

    // Static files
    app.use(express.static(path.join(__dirname, 'public')));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Routes
    app.get('/', async (req, res) => {
        const stats = {
            servers: client.guilds.cache.size,
            users: client.users.cache.size,
            uptime: Math.floor(client.uptime / 1000)
        };
        res.render('index', { stats });
    });

    // Start server
    app.listen(port, () => {
        console.log(`Website running on http://localhost:${port}`);
    });
}

module.exports = { startWebServer };
