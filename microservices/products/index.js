/**
 * @version 1.0
 * @author Fabio Compagnoni
 */
import express from "express";
import {Pool} from "pg";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import https from 'https';
const PORT = 4000;

import authJWT from "./common_scripts/authJWT.js";
import sendError from "./common_scripts/sendError.js";
import { isBodyString, isPrice } from "./common_scripts/bodyTypeChecker.js";
import { getCategoryID, generateArtisanProductSlug } from "./scripts/utils.js";

const port=4000;
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

app.use(express.json());
app.use(cookieParser());


app.listen(PORT, () => {
    console.log('Products service online');
});

app.get('/status', (req, res) => {
    res.send(JSON.stringify({ service: 'products', status: 'ok' }));
});

app.get('/', async (req, res) => {
    try {
        let query=`SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, short_description, price, u.name AS aname, surname, id_profile_picture, u.slug AS aslug FROM products p JOIN users u ON artisan = u."ID" WHERE removed = false `;

        const sql_res = await pool.query(query);

        const recent_products = [];
        for(const row of sql_res.rows) {
            const {id, pname, pslug, short_description, price, aname, surname, id_profile_picture, aslug} = row;
            const artisan_propic_link = id_profile_picture ? 'https://localhost:3000/images/' + id_profile_picture : null;
            const product_link = `https://localhost:3000/products/${aslug}/${pslug}`;

            const product_info = {
                id: id,
                name: pname,
                description: short_description,
                price: (price / 100),
                category: [],
                artisan: {
                    name: aname,
                    surname: surname,
                    photoProfile: artisan_propic_link
                },
                product_image: null,
                link: product_link
            };

            const product_image_res = await pool.query('SELECT "ID_image" FROM product_images WHERE "ID_product" = $1 AND position = 0', [id]);
            if(product_image_res.rowCount > 0)
                product_info.product_image = 'https://localhost:3000/images/' + product_image_res.rows[0].ID_image;

            const categories_res = await pool.query('SELECT name FROM categories JOIN product_categories ON "ID" = "ID_category" WHERE "ID_product" = $1', [id]);
            const categories = categories_res.rows.filter(e => e.name);

            product_info.category = categories;

            recent_products.push(product_info);
        }

        res.json({products: recent_products, pages: 1, numberProducts: sql_res.rowCount});
    } catch (err) {
        console.error('Error fetching products:', err);
        sendError(res, 500);
    }
});

app.post('/product', authJWT, async (req, res) => {
    const user_id = req.user.user_id;
    const { name, description, short_description, price, categories, images } = req.body;

    //validazione body
    if (!isBodyString(name, true) || !isBodyString(description, false) || !isBodyString(short_description, true) || !isPrice(price, false)) {
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

            await client.query('COMMIT');

            res.json({
                id: product_info.ID,
                name: product_info.name,
                description: product_info.short_description,
                price: (product_info.price / 100),
                category: categories,
                product_image: images[0]
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.log('Error creating product: ' + err);
            sendError(res, 500);
        } finally {
            client.release();
        }
    } catch(err) {
        console.log('Error creating product: ' + err);
        sendError(res, 500);
    }
});

https.createServer(credentials, app).listen(port, () => {
  console.log("Microservice products listening on port "+port);
});