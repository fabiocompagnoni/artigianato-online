import express, { response } from "express";
import {Pool} from "pg";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import https from 'https';
import fs from 'fs';

const PORT = 4000;

import authJWT from "./common_scripts/authJWT.js";
import sendError from "./common_scripts/sendError.js";
import { getRoleID, getOrderStatusID, getTicketStatusID } from './common_scripts/utils.js';
import { isBodyString, isBodyInt } from "./common_scripts/bodyTypeChecker.js";

const app = express();

const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});


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

app.enable('trust proxy');

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send(JSON.stringify({ service: 'tickets', status: 'ok' }));
});

function makeTicket(row, type) {
    const ticket = {
        type,
        id: row.ID,
        product_id: row.id_product,
        user_id: row.id_user,
        timestamp_open: row.timestamp_open,
        timestamp_resolved: row.timestamp_resolved,
        status: row.status_name,
        note: row.note,
        resolved_by: row.id_admin
    }

    if(type === 'product')
        ticket.product_id = row.id_product;
    else if(type === 'order')
        ticket.order_id = row.id_order;
    else
        throw Error('Error in ticket type');

    return ticket;
}

//per ottenere tutti i ticket
app.get('/fetchTickets', authJWT, async (req, res) => {
    try {
        //controllo che l'utente sia un admin
        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        if(req.user.user_role_id !== ADMIN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const tickets = [];

        //ticket dei prodotti
        const products_res = await pool.query(
            'SELECT tp.*, name AS status_name FROM ticket_products tp JOIN ticket_status ts ON status = ts."ID"'
        );

        for(const row of products_res.rows)
            tickets.push(makeTicket(row, 'product'));


        //ticket degli ordini
        const orders_res = await pool.query(
            'SELECT t_o.*, name AS status_name FROM ticket_orders t_o JOIN ticket_status ts ON status = ts."ID"'
        );

        for(const row of orders_res.rows)
            tickets.push(makeTicket(row, 'order'));
        
        res.json(tickets);
    } catch(err) {
        console.error('Error fetching tickets: ' + err);
        sendError(res, 500);
    }
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice tickets online");
});