import https from 'https';
import fs from 'fs';
import app, { allowedOrigins } from './app.js';

const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

const port = 3000;

https.createServer(credentials, app).listen(port, () => {
  console.log('Backend server listening on port ' + port);
  console.log('CORS configured for:', allowedOrigins.join(', '));
});