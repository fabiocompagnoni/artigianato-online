const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send(JSON.stringify({status: 'ok'}));
});

app.listen(port, () => {
    console.log('Backend server listening on port ' + port);
});