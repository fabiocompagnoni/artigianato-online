const http = require('http');
const port = 4000;

http.createServer((req, res) => {
    res.write(JSON.stringify({service: 'images', status: 'ok'}));
    res.end();
}).listen(port);

console.log('Images microservice online');