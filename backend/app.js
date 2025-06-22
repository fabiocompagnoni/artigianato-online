import express from 'express';
import cors from "cors";
import { createProxyMiddleware } from 'http-proxy-middleware';
import https from 'https';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();

// Configurazione CORS più robusta per lo sviluppo
export const allowedOrigins = [
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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res, next) => {
  if(process.env.NODE_ENV !== 'test')
    console.log(`[PROXY DEBUG] Richiesta ricevuta: ${req.method} ${req.originalUrl} da ${req.headers.origin || 'Nessuna origine'}`);
  next();
});


app.get('/', (req, res) => {
  res.json({status: 'ok', message: 'Backend proxy is running'});
});


const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/*microservizio users*/
app.use('/users', createProxyMiddleware({
  target: 'https://microservice_users:4000',
  changeOrigin: false,
  pathRewrite: { '^/users': '' },
  agent:httpsAgent,
  on: {
    error(err, req, res) {
      if(process.env.NODE_ENV !== 'test')
        console.error('Proxy error for /users:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      if(process.env.NODE_ENV !== 'test')
        console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      if(process.env.NODE_ENV !== 'test')
        console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));

/*microservizio images*/
app.use('/images', createProxyMiddleware({
  target: 'https://microservice_images:4000',
  changeOrigin: false,
  pathRewrite: { '^/images': '' },
  agent:httpsAgent,
  on: {
    error(err, req, res) {
      if(process.env.NODE_ENV !== 'test')
        console.error('Proxy error for /images:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      if(process.env.NODE_ENV !== 'test')
        console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      if(process.env.NODE_ENV !== 'test')
        console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));

/*microservizio products*/
app.use('/products', createProxyMiddleware({
  target: 'https://microservice_products:4000',
  changeOrigin: false,
  pathRewrite: { '^/products': '' },
  agent:httpsAgent,
  on: {
    error(err, req, res) {
      if(process.env.NODE_ENV !== 'test')
        console.error('Proxy error for /products:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      if(process.env.NODE_ENV !== 'test')
        console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      if(process.env.NODE_ENV !== 'test')
        console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));

/*microservizio purchases*/
app.use('/purchases', createProxyMiddleware({
  target: 'https://microservice_purchases:4000',
  changeOrigin: false,
  pathRewrite: { '^/purchases': '' },
  agent:httpsAgent,
  on: {
    error(err, req, res) {
      if(process.env.NODE_ENV !== 'test')
        console.error('Proxy error for /purchases:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      if(process.env.NODE_ENV !== 'test')
        console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      if(process.env.NODE_ENV !== 'test')
        console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));

/*microservizio tickets*/
app.use('/tickets', createProxyMiddleware({
  target: 'https://microservice_tickets:4000',
  changeOrigin: false,
  pathRewrite: { '^/tickets': '' },
  agent:httpsAgent,
  on: {
    error(err, req, res) {
      if(process.env.NODE_ENV !== 'test')
        console.error('Proxy error for /tickets:', err);
      res.status(500).send('Proxy error');
    },
    proxyReq(proxyReq, req, res) {
      // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
      if(process.env.NODE_ENV !== 'test')
        console.log('Proxying request to:', proxyReq.path);
    },
    proxyRes(proxyRes, req, res) {
      // Puoi ispezionare o modificare la risposta prima che venga inviata al client
      if(process.env.NODE_ENV !== 'test')
        console.log('Received response from target:', proxyRes.statusCode);
    }
  }
}));

export default app;