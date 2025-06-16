import express from 'express';
import cors from "cors";
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';
import https from 'https';

const app = express();
const port = 3000;

const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

// Configurazione CORS più robusta per lo sviluppo
const allowedOrigins = [
  'http://localhost:3000', // Il tuo backend stesso, se ti serve fare richieste a se stesso
  'http://localhost',      // Per casi in cui il browser non specifichi la porta
  'https://localhost',     // Per HTTPS (anche se in dev è meno comune)
  'http://127.0.0.1',
  'http://localhost:8000'  // Server di debug
];

app.use(cors({
  origin: function (origin, callback) {
    // Permetti le richieste senza origine (es. da Postman o curl)
    // E permetti le origini nella lista consentita
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin === 'null') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Necessario per l'invio di cookie (es. httpOnly)
}));

app.use((req, res, next) => {
  console.log(`[PROXY DEBUG] Richiesta ricevuta: ${req.method} ${req.originalUrl} da ${req.headers.origin || 'Nessuna origine'}`);
  next();
});

/*microservizio users*/
app.use('/users', createProxyMiddleware({
  target: 'http://microservice_users:4000',
  changeOrigin: false,
  pathRewrite: { '^/users': '' },
  on: {
    error(err, req, res) {
      console.error('Proxy error for /users:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));

/*microservizio images*/
app.use('/images', createProxyMiddleware({
  target: 'http://microservice_images:4000',
  changeOrigin: false,
  pathRewrite: { '^/images': '' },
  on: {
    error(err, req, res) {
      console.error('Proxy error for /images:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));


/*microservizio products*/
app.use('/products', createProxyMiddleware({
  target: 'http://microservice_products:4000',
  changeOrigin: false,
  pathRewrite: { '^/products': '' },
  on: {
    error(err, req, res) {
      console.error('Proxy error for /products:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));


app.get('/', (req, res) => {
  res.send(JSON.stringify({status: 'ok', message: 'Backend proxy is running'}));
});

https.createServer(credentials, app).listen(port, () => {
  console.log('Backend server listening on port ' + port);
  console.log('CORS configured for:', allowedOrigins.join(', '));
});