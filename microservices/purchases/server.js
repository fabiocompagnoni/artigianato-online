import express, { response } from "express";
import {Pool} from "pg";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import https from 'https';
import fs from 'fs';

const PORT = 4000;

import authJWT from "./common_scripts/authJWT.js";
import sendError from "./common_scripts/sendError.js";
import { getRoleID, getOrderStatusID, getTicketStatusID, getProductThumbnail } from './common_scripts/utils.js';
import { isBodyString, isBodyInt } from "./common_scripts/bodyTypeChecker.js";
import { selectLowestStatus } from "./scripts/utils.js";

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
    res.json({ service: 'purchases', status: 'ok' });
});

//per aggiungere/aggiornare quantità/rimuovere qualcosa al carrello
app.post('/addToCart', authJWT, async (req, res) => {
    try {
        const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);
        if(req.user.user_role_id !== CUSTOMER_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const items = req.body;
        console.log('Items to add to cart: ' + items);

        if(!items || !Array.isArray(items)) {
            sendError(res, 400);
            return;
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const response = [];

            for(const {id, quantity} of items) {
                const product_quantity_result = await client.query('SELECT quantity FROM products_view WHERE "ID" = $1', [id]);

                if(product_quantity_result.rowCount <= 0) { //prodotto non trovato
                    sendError(res, 523);
                    return;
                }

                //utilizzato per impedire di aggiungere al carrello una quantità oltre il limite dell'oggetto
                const max_quantity = product_quantity_result.rows[0].quantity;

                const quantity_result = await client.query('SELECT quantity FROM products_carts WHERE "ID_product" = $1 AND "ID_user" = $2', [id, req.user.user_id]);

                if(quantity_result.rowCount > 0) {
                    const updated_quantity = Math.min(max_quantity, Math.max(0, quantity_result.rows[0].quantity + quantity));
                    response.push({id, quantity: updated_quantity});

                    if(updated_quantity <= 0)
                        await client.query('DELETE FROM products_carts WHERE "ID_product" = $1 AND "ID_user" = $2', [id, req.user.user_id]);
                    else
                        await client.query('UPDATE products_carts SET quantity = $1 WHERE "ID_product" = $2 AND "ID_user" = $3', [updated_quantity, id, req.user.user_id]);
                } else { //il prodotto non è presente nel carrello
                    if(quantity > 0)
                        await client.query('INSERT INTO products_carts("ID_product", "ID_user", quantity) VALUES($1, $2, $3)', [id, req.user.user_id, Math.min(max_quantity, quantity)]);
                    response.push({id, quantity: Math.max(0, quantity)});
                }
            }

            await client.query('COMMIT');

            res.json(response);
        } catch(err) {
            await client.query('ROLLBACK');
            sendError(res, 400);
            console.log('Malformed body for addToCart, body: ' + items + ', error: ' + err);
        } finally {
            client.release();
        }
    } catch(err) {
        console.error('Error adding item to cart: ' + err);
        sendError(res, 500);
    }
});

//per ottenere informazioni sul proprio carrello
app.get('/cart', authJWT, async (req, res) => {
    try {
        const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);
        if(req.user.user_role_id !== CUSTOMER_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const sql_res = await pool.query(
            'SELECT p.slug AS pslug, u.slug AS aslug, quantity FROM products_carts JOIN products p ON p."ID" = "ID_product" JOIN users u ON artisan = u."ID" WHERE "ID_user" = $1', 
            [req.user.user_id]
        );

        res.json(sql_res.rows.map(row =>
            ({'slug': row.aslug + '/' + row.pslug, 'quantity': row.quantity})
        ));
    } catch(err) {
        console.error('Error adding item to cart: ' + err);
        sendError(res, 500);
    }
});

async function artisanOrdersHandler(req, res) {
    const sql_res = await pool.query(
        'SELECT "ID_order", "ID_product", quantity, single_product_price, p.name, os.name AS status FROM products_order JOIN products p ON "ID_product" = p."ID" JOIN order_status os ON os."ID" = status WHERE artisan = $1',
        [req.user.user_id]
    );

    const result = await Promise.all(sql_res.rows.map(async row => ({
        order_id: row.ID_order,
        product_id: row.ID_product,
        quantity: row.quantity,
        single_product_price: row.single_product_price,
        status: row.status,
        product_name: row.name,
        product_thumbnail: await getProductThumbnail(row.ID_product, pool)
    })));

    res.json(result);
}

//per verificare gli ordini effettuati o quelli ricevuti (se si è un artisan)
app.get('/orders', authJWT, async (req, res) => {
    try {
        const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        const response = [];

        if(req.user.user_role_id === ARTISAN_ROLE_ID) {
            await artisanOrdersHandler(req, res);
            return;
        }

        let query = 'SELECT "ID", timestamp_order, payment_intent FROM orders';
        let params = [];
        if(req.user.user_role_id === CUSTOMER_ROLE_ID) {
            query += ' WHERE id_user = $1';
            params = [req.user.user_id];
        }
        else if(req.user.user_role_id !== ADMIN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const sql_res = await pool.query(query, params);

        //calcolo della quantità di prodotti e prezzo totale nell'ordine
        for(const row of sql_res.rows) {
            const order_items = await pool.query(
                'SELECT p."ID", quantity, single_product_price, p.name, os.name AS status FROM products_order JOIN products p ON "ID_product" = p."ID" JOIN order_status os ON status = os."ID" WHERE "ID_order" = $1',
                [row.ID]
            );

            let products = [];
            let products_statuses = [];

            let total_items = 0;
            let total_price = 0;
            for(const inner_row of order_items.rows) {
                total_items += inner_row.quantity;
                total_price += inner_row.quantity * inner_row.single_product_price;
                products.push({name: inner_row.name, thumbnail: await getProductThumbnail(inner_row.ID, pool)});
                products_statuses.push(inner_row.status);
            }

            response.push({
                id: row.ID,
                timestamp: row.timestamp_order,
                payment_intent: row.payment_intent,
                amount_paid: total_price / 100,
                num_products: total_items,
                products,
                status: selectLowestStatus(products_statuses)
            });
        }

        res.json(response);
    } catch(err) {
        console.error('Error fetching purchases: ' + err);
        sendError(res, 500);
    }
});

//per verificare informazioni su un ordine
app.get('/order/:id_order', authJWT, async (req, res) => {
    try {
        const id_order = req.params.id_order;
        if(!isBodyInt(id_order)) {
            sendError(res, 400);
            return;
        }

        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        let sql_res = await pool.query(
            'SELECT id_user, timestamp_order FROM orders WHERE "ID" = $1',
            [id_order]
        );

        if(sql_res.rowCount === 0) {
            sendError(404);
            return;
        }

        if(sql_res.rows[0].id_user !== req.user.user_id && req.user.user_role_id !== ADMIN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const order_timestamp = sql_res.rows[0].timestamp_order;

        const response = {timestamp: order_timestamp, items: []};

        sql_res = await pool.query('SELECT "ID_product", quantity, single_product_price FROM products_order WHERE "ID_order" = $1', [id_order]);

        for(const row of sql_res.rows)
            response.items.push({
                id: row.ID_product,
                quantity: row.quantity,
                single_product_price: row.single_product_price,
            });

        res.json(response);
    } catch(err) {
        console.error('Error fetching order: ' + err);
        sendError(res, 500);
    }
});

//per effettuare un acquisto
app.post('/purchase', authJWT, async (req, res) => {
    try {
        const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);
        if(req.user.user_role_id !== CUSTOMER_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const STATUS_PAGATO_ID = await getOrderStatusID('Pagato', pool);
        const response = {order_id: -1, items: []};

        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            let sql_res = await client.query(
                'INSERT INTO orders(id_user, payment_intent) VALUES($1, \'sample_intent\') RETURNING "ID"',
                [req.user.user_id]
            );

            const order_id = sql_res.rows[0].ID;
            response.order_id = order_id;

            sql_res = await client.query(
                'SELECT "ID_product", quantity, price FROM products_carts JOIN products ON "ID_product" = "ID" WHERE "ID_user" = $1',
                [req.user.user_id]
            );

            if(sql_res.rowCount <= 0) {
                sendError(res, 525);
                return;
            }

            for(const row of sql_res.rows) {
                //controllo che il prodotto non sia stato esaurito
                const remaining_result = await client.query('SELECT quantity FROM products_view WHERE "ID" = $1', [row.ID_product]);
                if(remaining_result.rows[0].quantity < row.quantity)
                    throw Error({code: 'NEI1', message: 'Not enough items to purchase'});

                await client.query(
                    'INSERT INTO products_order("ID_order", "ID_product", quantity, single_product_price, status) VALUES ($1, $2, $3, $4, $5)',
                    [order_id, row.ID_product, row.quantity, row.price, STATUS_PAGATO_ID]
                );
                response.items.push({id: row.ID_product, quantity: row.quantity, single_product_price: row.price});
            }

            //svuota il carrello dopo l'acquisto
            await client.query(
                'DELETE FROM products_carts WHERE "ID_user" = $1',
                [req.user.user_id]
            );

            await client.query('COMMIT');

            res.json(response);
        } catch(err) {
            console.error('Error purchasing items: ' + err);
            if(err.code === 'NEI1')
                sendError(res, 524);
            else
                sendError(res, 500);
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    } catch(err) {
        console.error('Error purchasing items: ' + err);
        sendError(res, 500);
    }
});

//per modificare lo stato di un acquisto
app.put('/itemStatus', authJWT, async (req, res) => {
    const order_id = req.body.order_id;
    const item_id = req.body.item_id;
    const item_status = req.body.item_status;

    if(!order_id || !item_id || !item_status) {
        sendError(res, 400);
        return;
    }

    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        const STATUS_ID = await getOrderStatusID(item_status, pool);

        if(STATUS_ID === -1) {
            sendError(res, 400);
            return;
        }

        switch(req.user.user_role_id) {
            case ARTISAN_ROLE_ID:
                //controllo che l'artisan abbia accesso all'oggetto
                let sql_res = await pool.query('SELECT 1 FROM products WHERE "ID" = $1 AND artisan = $2', [item_id, req.user.user_id]);
                if(sql_res.rowCount === 0) {
                    sendError(res, 403);
                    return;
                }
            case ADMIN_ROLE_ID:
                await pool.query('UPDATE products_order SET status = $1 WHERE "ID_order" = $2 AND "ID_product" = $3', [STATUS_ID, order_id, item_id]);
                res.json({result: 'ok'});
                break;
            default:
                sendError(403);
        }
    } catch(err) {
        console.error('Error adding item to cart: ' + err);
        sendError(res, 500);
    }
});

//per segnalare un acquisto
app.post('/report/:id_order', authJWT, async (req, res) => {
    try {
        if(!req.body || !req.body.note || !isBodyString(req.body.note, true) ||
            !isBodyInt(req.params.id_order, true)) {
            sendError(400);
            return;
        }

        //controllo che l'utente abbia accesso all'ordine
        const sql_res = await pool.query('SELECT 1 FROM ORDERS WHERE "ID" = $1 AND id_user = $2', [req.params.id_order, req.user.user_id]);

        if(sql_res.rowCount > 0) {
            const STATUS_TICKET_APERTO_ID = await getTicketStatusID('Aperto', pool);
            await pool.query(
                'INSERT INTO ticket_orders(id_order, id_user, status, note) VALUES($1, $2, $3, $4)',
                [req.params.id_order, req.user.user_id, STATUS_TICKET_APERTO_ID, req.body.note]
            );

            res.json({status: 'ok'});
        }
        else
            sendError(res, 404);
    } catch (err) {
        console.error('Error adding fetching single product info: ' + err);
        sendError(res, 500);
    }
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice purchases online");
});