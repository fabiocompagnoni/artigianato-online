/**
 * @version 1.0
 * @author Fabio Compagnoni
 */
import express from "express";
import {Pool} from "pg";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import https from 'https';
import fs from 'fs';

const PORT = 4000;

import authJWT, { getJWTinfo } from "./common_scripts/authJWT.js";
import sendError from "./common_scripts/sendError.js";
import { isBodyString, isPrice, isBodyInt } from "./common_scripts/bodyTypeChecker.js";
import { getRoleID, getOrderStatusID, getTicketStatusID } from './common_scripts/utils.js';
import { getCategoryID, generateArtisanProductSlug } from "./scripts/utils.js";

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

app.get('/status', (req, res) => {
    res.send(JSON.stringify({ service: 'products', status: 'ok' }));
});
/**
 * API per ottenere tutti i prodotti
 */

const PER_PAGE=20;

const getProductThumbnail=async(idProduct)=>{
    let product_image = "https://localhost/src/img/placeholder.png";
    const product_image_res = await pool.query('SELECT "ID_image" FROM product_images WHERE "ID_product" = $1 AND position = 0', [idProduct]);
    if(product_image_res.rowCount > 0)
        product_image = 'https://localhost:3000/images/' + product_image_res.rows[0].ID_image;
    return product_image;  
}
const getProductImages=async(idProduct)=>{
    const product_images = [];
    const product_images_res = await pool.query('SELECT "ID_image" FROM product_images WHERE "ID_product" = $1', [idProduct]);
    for(const image of product_images_res.rows)
        product_images.push('https://localhost:3000/images/' + image.ID_image);
    return product_images;
}
const getCategories=async(idProduct)=>{
    let categories=[];
    const res=await pool.query('SELECT C."ID", C.name, C.slug FROM product_categories AS PC INNER JOIN categories AS C ON C."ID" = PC."ID_category" WHERE PC."ID_product" = $1 ORDER BY C.name ASC',[idProduct]);
    for(const row of res.rows){
        categories.push({
            id: row.ID,
            name: row.name,
            link: `/prodotti/categorie/${row.slug}`
        });
    }
    return categories;
}
const outputProduct=async(dbRow, single_product=false)=>{
    let categories=await getCategories(dbRow.id);
    const obj = {
        id: dbRow.id,
        name: dbRow.pname,
        description: dbRow.short_description,
        price: (dbRow.price / 100),
        categories: categories,
        artisan: {
            name: dbRow.aname,
            surname: dbRow.surname,
            photoProfile: dbRow.artisan_propic_link,
            link: `/artigiani/${dbRow.aslug}`,
        },
        link: `/prodotti/${dbRow.aslug}/${dbRow.pslug}`,
        quantity: parseInt(dbRow.availability),
        visits: parseInt(dbRow.visits)
    }

    if(single_product) {
        obj.images = await getProductImages(dbRow.id);
        obj.short_description = dbRow.short_description;
        obj.description = dbRow.description;
    }
    else {
        obj.thumbnail = await getProductThumbnail(dbRow.id);
        obj.description = dbRow.short_description;
    }

    return obj;
}

const base_query = 'SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, short_description, price, quantity AS availability, visits, u.name AS aname, surname, id_profile_picture, u.slug AS aslug FROM products_view p JOIN users u ON artisan = u."ID" WHERE 1 = 1 ';

//come la query sopra ma con l'aggiunta di "description"
const single_product_query = 'SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, description, short_description, price, quantity AS availability, visits, u.name AS aname, surname, id_profile_picture, u.slug AS aslug FROM products_view p JOIN users u ON artisan = u."ID" WHERE u.slug = $1 AND p.slug = $2';

app.get('/', async (req, res) => {
    try {
        const sql_res = await pool.query(base_query);

        const products = await Promise.all(sql_res.rows.map(row => outputProduct(row)));

        res.json({products: products, numberProducts: sql_res.rowCount});
    } catch (err) {
        console.error('Error fetching products:', err);
        sendError(res, 500);
    }
});

app.get('/product/:artisan_slug/:product_slug', async (req, res) => {
    const query = single_product_query;

    try {
        if(!isBodyInt(req.params.artisan_slug, true) || !isBodyInt(req.params.product_slug, true)) {
            sendError(res, 400);
            return;
        }

        const sql_res = await pool.query(query, [req.params.artisan_slug, req.params.product_slug]);

        if(sql_res.rowCount > 0) {
            const product = await outputProduct(sql_res.rows[0], true);

            //aggiungiamo una visita nel db
            try {
                const product_id = sql_res.rows[0].id;
                let viewer = null;
                const jwt_info = getJWTinfo(req);
                if(jwt_info)
                    viewer = jwt_info.user_id;
                const ip_address = req.ip;

                await pool.query('INSERT INTO product_visits("ID_product", id_user, ip_address) VALUES ($1, $2, $3)', [product_id, viewer, ip_address]);
            } catch(err) {
                console.error('Error adding user visit to product: ' + err);
            }

            res.json(product);
        }
        else
            sendError(res, 404);
    } catch (err) {
        console.error('Error adding fetching single product info: ' + err);
        sendError(res, 500);
    }
});

//per segnalare un oggetto
app.post('/report/:artisan_slug/:product_slug', authJWT, async (req, res) => {
    try {
        if(!req.body || !req.body.note || !isBodyString(req.body.note, true) ||
            !isBodyString(req.params.artisan_slug, true) || !isBodyString(req.params.product_slug, true)) {
            sendError(res, 400);
            return;
        }

        const sql_res = await pool.query(single_product_query, [req.params.artisan_slug, req.params.product_slug]);

        if(sql_res.rowCount > 0) {
            const STATUS_TICKET_APERTO_ID = await getTicketStatusID('Aperto', pool);
            const product_id = sql_res.rows[0].id;

            await pool.query(
                'INSERT INTO ticket_products(id_product, id_user, status, note) VALUES($1, $2, $3, $4)',
                [product_id, req.user.user_id, STATUS_TICKET_APERTO_ID, req.body.note]
            );

            res.json({status: 'ok'});
        }
        else
            sendError(res, 404);
    } catch (err) {
        console.error('Error reporting product: ' + err);
        sendError(res, 500);
    }
});

app.post('/product', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const user_id = req.user.user_id;
        const { name, description, short_description, price, categories, images, quantity } = req.body;

        //validazione body
        if (!isBodyString(name, true) || !isBodyString(description, false) || !isBodyString(short_description, true) || !isPrice(price, false) || !isBodyInt(quantity, true)) {
            sendError(res, 400);
            return;
        }

        //conversione del prezzo in centesimi
        const adjusted_price = Math.floor(price * 100);

        if(!Array.isArray(categories) || !Array.isArray(images)) {
            sendError(res, 400);
            return;
        }

        try {
            //il programma proseguirà solo una volta dopo aver completato tutte le promise
            const categories_ids = await Promise.all(categories.map(c => getCategoryID(c, pool)));

            const slug = await generateArtisanProductSlug(user_id, name, pool);

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                const sql_res = await client.query('INSERT INTO products(name, slug, description, short_description, price, artisan) VALUES($1, $2, $3, $4, $5, $6) RETURNING *', [
                    name,
                    slug,
                    description,
                    short_description,
                    adjusted_price,
                    user_id
                ]);

                const product_info = sql_res.rows[0];

                for(const cat_id of categories_ids)
                    await client.query('INSERT INTO product_categories("ID_category", "ID_product") VALUES ($1, $2)', [cat_id, product_info.ID]);

                for(const [position, image_id] of images.entries())
                    await client.query('INSERT INTO product_images("ID_product", "ID_image", position) VALUES ($1, $2, $3)', [product_info.ID, image_id, position]);

                await client.query('INSERT INTO products_restock("ID_product", quantity) VALUES ($1, $2)', [product_info.ID, quantity]);

                await client.query('COMMIT');

                res.json({
                    id: product_info.ID,
                    name: product_info.name,
                    description: product_info.short_description,
                    price: Math.floor(product_info.price / 100),
                    category: categories,
                    product_image: images[0],
                    quantity: quantity
                });
            } catch (err) {
                await client.query('ROLLBACK');
                if (err.code === '23503' || err.code === '22P02') // foreign key violation (id immagine non presente) o id non valido
                    sendError(res, 521);
                else {
                    console.error('Error creating product: ' + err);
                    sendError(res, 500);
                }
            } finally {
                client.release();
            }
        } catch(err) {
            console.error('Error creating product: ' + err);
            sendError(res, 500);
        }
    } catch (err) {
        console.error('Error creating product: ' + err);
        sendError(res, 500);
    }
});

//edit product
app.put('/product/:slug', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!req.params || !req.params.slug) {
            sendError(res, 400);
            return;
        }

        const product_slug = req.params.slug;

        const user_id = req.user.user_id;
        const edits = req.body;

        if (typeof edits === 'undefined' || Object.keys(edits).length === 0) {
            sendError(res, 400); // Bad request se non ci sono edits
            return;
        }

        //controllo che l'utente abbia accesso al prodotto
        const check_query_result = await pool.query('SELECT "ID" FROM products WHERE slug = $1 AND artisan = $2', [product_slug, user_id]);
        if(check_query_result.rowCount === 0) {
            sendError(res, 403);
            return;
        }

        const product_id = check_query_result.rows[0].ID;

        const { name, description, short_description, price, categories, images, quantity } = edits;

        //controlla che, se la categoria è presente, sia conforme
        if (typeof(name) !== 'undefined' && !isBodyString(name, true) ||
        typeof(description) !== 'undefined' && !isBodyString(description, false) ||
        typeof(short_description) !== 'undefined' && !isBodyString(short_description, true) ||
        typeof(price) !== 'undefined' && !isPrice(price, false) ||
        typeof(quantity) !== 'undefined' && !isBodyInt(quantity, true)) {
            sendError(res, 400);
            return;
        }

        const actions = ['name', 'description', 'short_description'];

        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Inizia la transazione

            const response = { password_changed: false };
            for (const act of actions) {
                if (typeof edits[act] !== 'undefined') {
                    const sql_res = await client.query(
                        `UPDATE products SET ${act} = $1 WHERE "ID" = $2 AND artisan = $3 RETURNING ${act}`,
                        [edits[act], product_id, user_id]
                    );
                    if (sql_res.rowCount > 0) {
                        response[act] = sql_res.rows[0][act];
                    }
                }
            }

            if (typeof price !== 'undefined') {
                const adjusted_price = Math.floor(price * 100);
                await client.query(
                    'UPDATE products SET price = $1 WHERE "ID" = $2 AND artisan = $3',
                    [adjusted_price, product_id, user_id]
                );
                response.price = price;
            }

            if (typeof quantity !== 'undefined') {
                await client.query(
                    'INSERT INTO products_restock("ID_product", quantity) VALUES ($1, $2)',
                    [product_id, quantity]
                );
                response.quantity = quantity;
            }

            if (typeof categories !== 'undefined') {
                await client.query(
                    'DELETE FROM product_categories WHERE "ID_product" = $1',
                    [product_id]
                );

                const categories_ids = await Promise.all(categories.map(c => getCategoryID(c, pool)));

                for(const cat_id of categories_ids)
                    await client.query(
                        'INSERT INTO product_categories("ID_category", "ID_product") VALUES ($1, $2)',
                        [cat_id, product_id]
                    );
            }

            if (typeof images !== 'undefined') {
                await client.query(
                    'DELETE FROM product_images WHERE "ID_product" = $1',
                    [product_id]
                );

                for(const [position, image_id] of images.entries())
                    await client.query(
                        'INSERT INTO product_images("ID_product", "ID_image", position) VALUES ($1, $2, $3)',
                        [product_id, image_id, position]
                    );
            }

            await client.query('COMMIT'); // Commette la transazione

            res.json(response);
        } catch (err) {
            console.error('Error updating product: ', err);
            sendError(res, 500);
            await client.query('ROLLBACK'); // Fa il rollback in caso di errore
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error updating product: ' + err);
        sendError(res, 500);
    }
});

//delete product (lo marchia come eliminato nel db)
app.delete('/product/:slug', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const sql_res = await pool.query('UPDATE products SET removed = true WHERE slug = $1 AND artisan = $2', [req.params.slug, req.user.user_id]);

        if(sql_res.rowCount > 0) //il prodotto è stato eliminato
            res.json({status: 'ok'});
        else //il prodotto non è stato elminato perché non esiste una coppia (slug, utente) che combaci con la richiesta
            sendError(res, 401);
    } catch (err) {
        console.error('Error deleting product: ' + err);
        sendError(res, 500);
    }
});

function getPercentage(total, last2w) {
    if(total === 0)
        return 0;
    return Math.round(last2w / total * 1000) / 10;
}

function getMonthDay(date) {
	date = new Date(date)
	return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
}

function getLXDObject(days) {
	const today = new Date();
	const obj = {};
	for(let i = 0; i <= days; i++) {
		const prev_day = new Date().setDate(today.getDate() - i);
		obj[getMonthDay(prev_day)] = 0;
	}

	return obj;
}

//per ottenere le informazioni per la dashboard artigiani
app.get('/dashboard/:days', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!req.params || !req.params.days || !isBodyInt(req.params.days, false)) {
            sendError(res, 400);
            return;
        }

        const ANNULLATO_STATUS_ID = await getOrderStatusID('Annullato', pool);
        const RIMBORSATO_STATUS_ID = await getOrderStatusID('Rimborsato', pool);

        let days = req.params.days;

        //se days è negativo, calcoliamo la data più lontana
        if(days < 0) {
            let sql_res = await pool.query(
                'SELECT timestamp_creation FROM products WHERE artisan = $1 ORDER BY timestamp_creation ASC LIMIT 1',
                [req.user.user_id]
            );

            if(sql_res.rowCount > 0) {
                const old_date = new Date(getMonthDay(sql_res.rows[0].timestamp_creation));
                const diff = Math.round((new Date(getMonthDay(new Date())) - old_date) / (1000 * 60 * 60 * 24));
                days = diff;
            }
            else
                days = 0;
        }

        //timestamp di x giorni fa
        const date_x_days_ago = new Date(getMonthDay(new Date().setDate(new Date().getDate() - days)));
        const performance_sales = getLXDObject(days);
        const performance_visits = getLXDObject(days);
        const performance_refunds = getLXDObject(days);

        //info vendite
        let sql_res = await pool.query(
            'SELECT quantity, single_product_price, timestamp_order FROM products_order JOIN orders o ON o."ID" = "ID_order" JOIN products p ON p."ID" = "ID_product" WHERE status <> $1 AND status <> $2 AND artisan = $3',
            [ANNULLATO_STATUS_ID, RIMBORSATO_STATUS_ID, req.user.user_id]
        );

        const total_orders = sql_res.rowCount;
        let total_gain = 0;
        let total_gain_lxd = 0;

        for(const row of sql_res.rows) {
            const total_price = row.quantity * row.single_product_price / 100;
            total_gain += total_price;
            if(new Date(getMonthDay(row.timestamp_order)) >= date_x_days_ago) {
                performance_sales[getMonthDay(row.timestamp_order)] += total_price;
                total_gain_lxd += total_price;
            }
        }

        const sales = {
            total_orders,
            total_gain,
            total_gain_last_days: total_gain_lxd,
            total_gain_last_days_percent: getPercentage(total_gain, total_gain_lxd)
        };

        //info visite
        sql_res = await pool.query(
            'SELECT timestamp_visit FROM product_visits JOIN products ON "ID" = "ID_product" WHERE artisan = $1',
            [req.user.user_id]
        );

        const total_visits = sql_res.rowCount;
        let total_visits_lxd = 0;

        for(const row of sql_res.rows) {
            if(new Date(getMonthDay(row.timestamp_visit)) >= date_x_days_ago) {
                performance_visits[getMonthDay(row.timestamp_visit)]++;
                total_visits_lxd++;
            }
        }

        const visits = {
            total_visits,
            total_visits_last_days: total_visits_lxd,
            total_visits_last_days_percent: getPercentage(total_visits, total_visits_lxd)
        }

        //info rimborsi
        sql_res = await pool.query(
            'SELECT quantity, timestamp_order FROM products_order JOIN orders o ON o."ID" = "ID_order" JOIN products p ON p."ID" = "ID_product" WHERE status = $1 AND artisan = $2',
            [RIMBORSATO_STATUS_ID, req.user.user_id]
        );

        const total_refunds = sql_res.rowCount;
        let total_refunds_lxd = 0;

        for(const row of sql_res.rows) {
            if(new Date(getMonthDay(row.timestamp_order)) >= date_x_days_ago) {
                performance_refunds[getMonthDay(row.timestamp_order)] += row.quantity;
                total_refunds_lxd += row.quantity;
            }
        }

        const refunds = {
            total_refunds,
            total_refunds_last_days: total_refunds_lxd,
            total_refunds_last_days_percent: getPercentage(total_refunds, total_refunds_lxd)
        };
        
        res.json({
            sales,
            visits,
            refunds,
            performance: {
                sales: performance_sales,
                visits: performance_visits,
                refunds: performance_refunds
            }
        });
    } catch (err) {
        console.error('Error fetching dashboard data: ' + err);
        sendError(res, 500);
    }
});

/**
 * API per ottenere i prodotti divisi per pagina con i filtri
 */
app.get("/:page",async(req,res)=>{
    let queryStandard=base_query;

    let query_placeholder_num = 1;
    let query_placeholder_values = [];

    //applicazione dei filti
    if(req.query){
        let filter = req.query;
        
        if(filter.artisan!=null){
            //artisan products only
            queryStandard+=`AND u.slug = '${filter.artisan}' `;
        }
        if(filter.disponibilita!=null){
            if(filter.disponibilita.length==1){
                    if(filter.disponibilita[0]==0)
                        queryStandard+=`AND availability = 0 `;
                    else
                        queryStandard+=`AND availability > 0 `;
                }
            }
        if(filter.prezzi!=null){
            if(filter.prezzi.min!=null) {
                queryStandard+=`AND price >= $${query_placeholder_num++} `;
                query_placeholder_values.push(filter.prezzi.min);
            }
            if(filter.prezzi.max!=null) {
                queryStandard+=`AND price <= $${query_placeholder_num++} `;
                query_placeholder_values.push(filter.prezzi.max);
            }

        }
        if(filter.queryString!=null){
            queryStandard+=`AND p.name LIKE $${query_placeholder_num++} `;
            query_placeholder_values.push('%' + filter.queryString + '%');
        }
        
    }
    if(req.query.order){
        queryStandard+=`ORDER BY $${query_placeholder_num++} `;
        query_placeholder_values.push(req.query.order);
    }else{
        queryStandard+=`ORDER BY timestamp_last_update DESC `;
    }

    //query di copia per ottenere tutti i prodotti con questi filtri
    let queryCopy=queryStandard;
    //applicazione delle pagine
    let page=req.params.page;
    if(!isBodyInt(page)) {
        sendError(res, 404);
        return;
    }
    let offset=(page-1)*PER_PAGE;
    queryStandard+=`LIMIT ${PER_PAGE} OFFSET ${offset} `;
    
    try{
        console.log("QUERY DA ESEGUIRE "+queryStandard);
        console.log("PLACEHOLDER UTILIZZATI "+query_placeholder_values);
        const sql_res=await pool.query(queryStandard, query_placeholder_values);
        
        const products = await Promise.all(sql_res.rows.map(row => outputProduct(row)));
        //ottengo il numero delle pagine e il numero di prodotti totali
        const ris2=await pool.query(queryCopy, query_placeholder_values);
        let pages=Math.ceil(ris2.rowCount/PER_PAGE);
        let numProducts=ris2.rowCount;
        res.json({products:products,pages:pages,numProducts:numProducts});
    }catch(err){
        console.error('Error fetching products:',err);
        sendError(res,500);
    }
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice products online");
});