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

const PER_PAGE = 20;

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
    res.json({ service: 'tickets', status: 'ok' });
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
app.get('/fetchTickets/:page', authJWT, async (req, res) => {
    try {
        if(!req.params || !req.params.page || !isBodyInt(req.params.page, true)) {
            sendError(res, 400);
            return;
        }

        const { page } = req.params;

        //controllo che l'utente sia un admin
        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        if(req.user.user_role_id !== ADMIN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const tickets = [];

        const query_products = 'SELECT tp.*, name AS status_name FROM ticket_products tp JOIN ticket_status ts ON status = ts."ID"';
        const query_orders = 'SELECT t_o.*, name AS status_name FROM ticket_orders t_o JOIN ticket_status ts ON status = ts."ID"';
        const limit = PER_PAGE / 2;
        const offset = (page - 1) * limit;

        //ticket dei prodotti
        const products_pages_res = await pool.query(query_products);
        const products_res = await pool.query(query_products + ' LIMIT 10 OFFSET $1', [offset]);

        for(const row of products_res.rows)
            tickets.push(makeTicket(row, 'product'));

        let num_tickets = products_pages_res.rowCount;


        //ticket degli ordini
        const orders_pages_res = await pool.query(query_orders);
        const orders_res = await pool.query(query_orders + ' LIMIT 10 OFFSET $1', [offset]);

        for(const row of orders_res.rows)
            tickets.push(makeTicket(row, 'order'));

        num_tickets += orders_pages_res.rowCount;

        const pages = Math.ceil(num_tickets / PER_PAGE);
        
        res.json({tickets, pages, num_tickets});
    } catch(err) {
        console.error('Error fetching tickets: ' + err);
        sendError(res, 500);
    }
});

//per chiudere i ticket
app.post('/resolve/:ticket_type/:ticket_id', authJWT, async (req, res) => {
    try {
        //controllo che la route sia corretta
        if(!req.params || !req.params.ticket_type ||
        req.params.ticket_type !== 'product' && req.params.ticket_type !== 'order') {
            sendError(res, 404);
            return;
        }

        //per il controllo effettuato prima, potrà essere solo 'product' oppure 'order'
        const ticket_type = req.params.ticket_type;

        //controllo che l'utente sia un admin
        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        if(req.user.user_role_id !== ADMIN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!isBodyInt(req.params.ticket_id)) {
            sendError(res, 400);
            return;
        }

        const STATUS_TICKET_APERTO_ID = await getTicketStatusID('Aperto', pool);
        const STATUS_TICKET_CHIUSO_ID = await getTicketStatusID('Chiuso', pool);

        //verifico che il ticket esista e sia aperto
        const sql_res = await pool.query(
            `SELECT 1 FROM ticket_${ticket_type}s WHERE "ID" = $1 AND status = $2`,
            [req.params.ticket_id, STATUS_TICKET_APERTO_ID]
        );

        if(sql_res.rowCount <= 0) {
            sendError(res, 404);
            return;
        }

        //chiudo il ticket
        await pool.query(
            `UPDATE ticket_${ticket_type}s SET timestamp_resolved = CURRENT_TIMESTAMP, status = $1, id_admin = $2 WHERE "ID" = $3`,
            [STATUS_TICKET_CHIUSO_ID, req.user.user_id, req.params.ticket_id]
        );
        res.json({status: 'ok'});
    } catch(err) {
        console.error('Error fetching tickets: ' + err);
        sendError(res, 500);
    }
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice tickets online");
});