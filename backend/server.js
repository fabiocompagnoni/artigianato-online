import express from 'express';
import cors from "cors";
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = 3000;

// Configurazione CORS più robusta per lo sviluppo
const allowedOrigins = [
  'http://localhost:3000', // Il tuo backend stesso, se ti serve fare richieste a se stesso
  'http://localhost',      // Per casi in cui il browser non specifichi la porta
  'https://localhost',     // Per HTTPS (anche se in dev è meno comune)
  'http://127.0.0.1',
];

app.use(cors({
  origin: function (origin, callback) {
    // Permetti le richieste senza origine (es. da Postman o curl)
    // E permetti le origini nella lista consentita
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Necessario per l'invio di cookie (es. httpOnly)
}));

// Gestione delle richieste OPTIONS preflight
//app.options('*', cors());

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[PROXY DEBUG] Richiesta ricevuta: ${req.method} ${req.originalUrl} da ${req.headers.origin || 'Nessuna origine'}`);
  next();
});

/*microservizio users*/
app.use('/users', createProxyMiddleware({
  target: 'http://localhost:4000',
  changeOrigin: false,
  pathRewrite: { '^/users': '' },
  onError(err, res) {
    console.error('Proxy error for /users:', err);
    res.status(500).send('Proxy error');
  },
  onProxyReq(proxyReq) {
    // Puoi ispezionare o modificare la richiesta prima che venga inviata al target
    console.log('Proxying request to:', proxyReq.path);
  },
  onProxyRes(proxyRes) {
    // Puoi ispezionare o modificare la risposta prima che venga inviata al client
    console.log('Received response from target:', proxyRes.statusCode);
  }
}));


app.get('/', (req, res) => {
  res.send(JSON.stringify({status: 'ok', message: 'Backend proxy is running'}));
});

app.listen(port, () => {
  console.log('Backend server listening on port ' + port);
  console.log('CORS configured for:', allowedOrigins.join(', '));
});